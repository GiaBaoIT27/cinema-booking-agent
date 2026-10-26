import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentsService } from './payments.service.js';
import { PaymentStatus } from '../../domain/enums/payment-status.enum.js';
import { PaymentMethod } from '../../domain/enums/payment-method.enum.js';
import type { IPaymentRepository } from '../../domain/repositories/payment.repository.interface.js';
import type { PaymentGatewayRegistry } from '../../infrastructure/gateways/payment-gateway.registry.js';
import type { OrdersFacade } from '#modules/orders/public-api/orders.facade.js';
import type { EventEmitter2 } from '@nestjs/event-emitter';

describe('PaymentsService (Application & Idempotency)', () => {
  let service: PaymentsService;
  let paymentRepoMock: IPaymentRepository;
  let gatewayRegistryMock: PaymentGatewayRegistry;
  let ordersFacadeMock: OrdersFacade;
  let eventEmitterMock: EventEmitter2;

  beforeEach(() => {
    paymentRepoMock = {
      findPaymentByOrderId: vi.fn(),
      createPayment: vi.fn(),
      savePayment: vi.fn(),
      findTransactionByTxnRef: vi.fn(),
      createTransaction: vi.fn(),
      saveTransaction: vi.fn(),
    } as unknown as IPaymentRepository;

    gatewayRegistryMock = {
      getGateway: vi.fn(),
    } as unknown as PaymentGatewayRegistry;

    ordersFacadeMock = {
      getOrderSummary: vi.fn(),
      fulfillOrder: vi.fn(),
      failOrder: vi.fn(),
    } as unknown as OrdersFacade;

    eventEmitterMock = {
      emit: vi.fn(),
    } as unknown as EventEmitter2;

    service = new PaymentsService(
      paymentRepoMock,
      gatewayRegistryMock,
      ordersFacadeMock,
      eventEmitterMock,
    );
  });

  describe('handleIpn (Webhook processing & Idempotency)', () => {
    it('should return RspCode: 97 if checksum is invalid', async () => {
      const mockGateway = {
        verifyIpn: vi.fn().mockResolvedValue({
          isValid: false,
          gatewayTxnRef: 'txn-1',
          responseCode: '97',
        }),
      };
      vi.mocked(gatewayRegistryMock.getGateway).mockReturnValue(
        mockGateway as any,
      );

      const res = await service.handleIpn(PaymentMethod.VNPAY, {});

      expect(res).toEqual({ RspCode: '97', Message: 'Invalid Checksum' });
      expect(paymentRepoMock.findTransactionByTxnRef).not.toHaveBeenCalled();
    });

    it('should return RspCode: 01 if transaction record not found', async () => {
      const mockGateway = {
        verifyIpn: vi.fn().mockResolvedValue({
          isValid: true,
          gatewayTxnRef: 'txn-unknown',
          amount: 50000,
        }),
      };
      vi.mocked(gatewayRegistryMock.getGateway).mockReturnValue(
        mockGateway as any,
      );
      vi.mocked(paymentRepoMock.findTransactionByTxnRef).mockResolvedValue(
        null,
      );

      const res = await service.handleIpn(PaymentMethod.VNPAY, {});

      expect(res).toEqual({ RspCode: '01', Message: 'Order not found' });
    });

    it('should return RspCode: 04 if amount does not match', async () => {
      const mockGateway = {
        verifyIpn: vi.fn().mockResolvedValue({
          isValid: true,
          gatewayTxnRef: 'txn-1',
          amount: 100000,
        }),
      };
      vi.mocked(gatewayRegistryMock.getGateway).mockReturnValue(
        mockGateway as any,
      );
      vi.mocked(paymentRepoMock.findTransactionByTxnRef).mockResolvedValue({
        amount: 50000,
      } as any);

      const res = await service.handleIpn(PaymentMethod.VNPAY, {});

      expect(res).toEqual({ RspCode: '04', Message: 'Invalid amount' });
    });

    it('should be IDEMPOTENT: return RspCode: 02 without re-processing if transaction was already SUCCESS', async () => {
      const mockGateway = {
        verifyIpn: vi.fn().mockResolvedValue({
          isValid: true,
          gatewayTxnRef: 'txn-1',
          amount: 50000,
        }),
      };
      vi.mocked(gatewayRegistryMock.getGateway).mockReturnValue(
        mockGateway as any,
      );
      vi.mocked(paymentRepoMock.findTransactionByTxnRef).mockResolvedValue({
        amount: 50000,
        paymentStatus: PaymentStatus.SUCCESS,
      } as any);

      const res = await service.handleIpn(PaymentMethod.VNPAY, {});

      expect(res).toEqual({
        RspCode: '02',
        Message: 'Order already confirmed',
      });
      expect(ordersFacadeMock.fulfillOrder).not.toHaveBeenCalled();
      expect(eventEmitterMock.emit).not.toHaveBeenCalled();
    });

    it('should fulfill order and emit PaymentSucceededEvent when payment succeeds', async () => {
      const mockGateway = {
        verifyIpn: vi.fn().mockResolvedValue({
          isValid: true,
          isSuccess: true,
          gatewayTxnRef: 'txn-1',
          amount: 50000,
          transactionNo: 'vnpay-999',
          responseCode: '00',
          rawPayload: {},
        }),
      };
      vi.mocked(gatewayRegistryMock.getGateway).mockReturnValue(
        mockGateway as any,
      );

      const transaction = {
        orderId: 'order-10',
        amount: 50000,
        paymentStatus: PaymentStatus.INITIATED,
      };
      vi.mocked(paymentRepoMock.findTransactionByTxnRef).mockResolvedValue(
        transaction as any,
      );
      vi.mocked(paymentRepoMock.findPaymentByOrderId).mockResolvedValue(
        {} as any,
      );

      const res = await service.handleIpn(PaymentMethod.VNPAY, {});

      expect(res).toEqual({ RspCode: '00', Message: 'Confirm Success' });
      expect(transaction.paymentStatus).toBe(PaymentStatus.SUCCESS);
      expect(paymentRepoMock.saveTransaction).toHaveBeenCalledWith(transaction);
      expect(ordersFacadeMock.fulfillOrder).toHaveBeenCalledWith(
        'order-10',
        expect.anything(),
      );
      expect(eventEmitterMock.emit).toHaveBeenCalledWith(
        'payment.succeeded',
        expect.anything(),
      );
    });

    it('should mark failed and emit PaymentFailedEvent when payment gateway returns failure code', async () => {
      const mockGateway = {
        verifyIpn: vi.fn().mockResolvedValue({
          isValid: true,
          isSuccess: false,
          gatewayTxnRef: 'txn-1',
          amount: 50000,
          transactionNo: 'vnpay-fail',
          responseCode: '24', // User canceled transaction
          rawPayload: {},
        }),
      };
      vi.mocked(gatewayRegistryMock.getGateway).mockReturnValue(
        mockGateway as any,
      );

      const transaction = {
        orderId: 'order-10',
        amount: 50000,
        paymentStatus: PaymentStatus.INITIATED,
      };
      vi.mocked(paymentRepoMock.findTransactionByTxnRef).mockResolvedValue(
        transaction as any,
      );
      vi.mocked(paymentRepoMock.findPaymentByOrderId).mockResolvedValue(
        {} as any,
      );

      const res = await service.handleIpn(PaymentMethod.VNPAY, {});

      expect(res).toEqual({ RspCode: '00', Message: 'Confirm Success' });
      expect(transaction.paymentStatus).toBe(PaymentStatus.FAILED);
      expect(paymentRepoMock.saveTransaction).toHaveBeenCalledWith(transaction);
      expect(eventEmitterMock.emit).toHaveBeenCalledWith(
        'payment.failed',
        expect.anything(),
      );
    });
  });
});
