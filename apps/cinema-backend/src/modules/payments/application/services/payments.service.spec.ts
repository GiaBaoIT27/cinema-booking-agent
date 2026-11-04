import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentsService } from './payments.service.js';
import { PaymentStatus } from '../../domain/enums/payment-status.enum.js';
import { PaymentMethod } from '../../domain/enums/payment-method.enum.js';
import type { IPaymentRepository } from '../../domain/repositories/payment.repository.interface.js';
import type { PaymentGatewayRegistry } from '../../infrastructure/gateways/payment-gateway.registry.js';
import type { OrdersFacade } from '#modules/orders/public-api/orders.facade.js';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { RefundService } from './refund.service.js';
import { BusinessException } from '#src/common/exceptions/business.exception.js';
import { ErrorCode } from '#src/common/constants/error-codes.enum.js';

const TXN_REF = 'ORD-1_111';

describe('PaymentsService – IPN idempotent & không bao giờ "mất tiền mà không có vé"', () => {
  let service: PaymentsService;
  let repo: IPaymentRepository;
  let gatewayRegistry: PaymentGatewayRegistry;
  let orders: OrdersFacade;
  let events: EventEmitter2;
  let refunds: RefundService;
  let gateway: { verifyIpn: ReturnType<typeof vi.fn>; createPaymentUrl: ReturnType<typeof vi.fn> };

  const txn = (over: Record<string, unknown> = {}) =>
    ({
      id: 't1',
      orderId: 'order-10',
      txnRef: TXN_REF,
      amount: 50000,
      paymentGateway: PaymentMethod.VNPAY,
      paymentStatus: PaymentStatus.INITIATED,
      settledAt: null,
      ...over,
    }) as any;

  const ipn = (over: Record<string, unknown> = {}) =>
    gateway.verifyIpn.mockResolvedValue({
      isValid: true,
      isSuccess: true,
      gatewayTxnRef: TXN_REF,
      amount: 50000,
      transactionNo: 'vnp-1',
      responseCode: '00',
      message: 'ok',
      rawPayload: {},
      ...over,
    });

  const orderSummary = (status: string, paidTxnRef: string | null = null) =>
    vi.mocked(orders.getOrderSummary).mockResolvedValue({
      id: 10,
      status,
      paidTxnRef,
    } as any);

  const businessError = (code: ErrorCode) => new BusinessException(code, code);

  beforeEach(() => {
    repo = {
      findPaymentByOrderId: vi.fn().mockResolvedValue({
        id: 'p1',
        gatewayTxnRef: TXN_REF,
        status: PaymentStatus.INITIATED,
      }),
      createPayment: vi.fn(),
      savePayment: vi.fn(),
      findTransactionByTxnRef: vi.fn(),
      createTransaction: vi.fn(),
      saveTransaction: vi.fn(),
      findTransactionsByOrderId: vi.fn(),
      transitionTransaction: vi.fn().mockResolvedValue(true),
      markTransactionSettled: vi.fn(),
      findUnsettledSuccessful: vi.fn().mockResolvedValue([]),
      findTransactionsByStatus: vi.fn().mockResolvedValue([]),
    } as unknown as IPaymentRepository;

    gateway = { verifyIpn: vi.fn(), createPaymentUrl: vi.fn().mockResolvedValue('https://pay') };
    gatewayRegistry = {
      getGateway: vi.fn().mockReturnValue(gateway),
    } as unknown as PaymentGatewayRegistry;

    orders = {
      getOrderSummary: vi.fn(),
      fulfillOrder: vi.fn().mockResolvedValue({}),
    } as unknown as OrdersFacade;
    events = { emit: vi.fn() } as unknown as EventEmitter2;
    refunds = {
      refundTransaction: vi.fn().mockResolvedValue(true),
    } as unknown as RefundService;

    service = new PaymentsService(repo, gatewayRegistry, orders, events, refunds);
  });

  describe('kiểm tra đầu vào', () => {
    it('97 khi sai chữ ký', async () => {
      ipn({ isValid: false });
      expect(await service.handleIpn(PaymentMethod.VNPAY, {})).toEqual({
        RspCode: '97',
        Message: 'Invalid Checksum',
      });
      expect(repo.findTransactionByTxnRef).not.toHaveBeenCalled();
    });

    it('01 khi không có giao dịch', async () => {
      ipn();
      vi.mocked(repo.findTransactionByTxnRef).mockResolvedValue(null);
      expect((await service.handleIpn(PaymentMethod.VNPAY, {})).RspCode).toBe('01');
    });

    it('04 khi sai số tiền', async () => {
      ipn({ amount: 100000 });
      vi.mocked(repo.findTransactionByTxnRef).mockResolvedValue(txn());
      expect((await service.handleIpn(PaymentMethod.VNPAY, {})).RspCode).toBe('04');
      expect(repo.transitionTransaction).not.toHaveBeenCalled();
    });
  });

  describe('thanh toán thành công', () => {
    beforeEach(() => {
      ipn();
      vi.mocked(repo.findTransactionByTxnRef).mockResolvedValue(txn());
    });

    it('ghi SUCCESS bằng compare-and-set, xuất vé kèm txnRef, chốt sổ, phát event', async () => {
      const res = await service.handleIpn(PaymentMethod.VNPAY, {});

      expect(res).toEqual({ RspCode: '00', Message: 'Confirm Success' });
      expect(repo.transitionTransaction).toHaveBeenCalledWith(
        TXN_REF,
        PaymentStatus.INITIATED,
        PaymentStatus.SUCCESS,
        expect.objectContaining({ transactionNo: 'vnp-1', paidAt: expect.any(Date) }),
      );
      expect(orders.fulfillOrder).toHaveBeenCalledWith('order-10', expect.anything(), TXN_REF);
      expect(repo.markTransactionSettled).toHaveBeenCalledWith(TXN_REF, expect.any(Date));
      expect(events.emit).toHaveBeenCalledWith('payment.succeeded', expect.anything());
      expect(refunds.refundTransaction).not.toHaveBeenCalled();
    });

    it('ghế không còn => chuyển REFUND_PENDING, chốt sổ, hoàn tiền ngay', async () => {
      vi.mocked(orders.fulfillOrder).mockRejectedValue(
        businessError(ErrorCode.ORDER_SEATS_NO_LONGER_AVAILABLE),
      );

      const res = await service.handleIpn(PaymentMethod.VNPAY, {});

      expect(res.RspCode).toBe('00');
      expect(repo.transitionTransaction).toHaveBeenCalledWith(
        TXN_REF,
        PaymentStatus.SUCCESS,
        PaymentStatus.REFUND_PENDING,
      );
      expect(repo.markTransactionSettled).toHaveBeenCalled();
      expect(refunds.refundTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ txnRef: TXN_REF, paymentStatus: PaymentStatus.REFUND_PENDING }),
        expect.any(String),
      );
      expect(events.emit).not.toHaveBeenCalledWith('payment.succeeded', expect.anything());
    });

    it('tiền về khi đơn đã hết hạn/hủy => hoàn tiền', async () => {
      vi.mocked(orders.fulfillOrder).mockRejectedValue(
        businessError(ErrorCode.ORDER_ALREADY_PROCESSED),
      );
      orderSummary('EXPIRED');

      await service.handleIpn(PaymentMethod.VNPAY, {});

      expect(refunds.refundTransaction).toHaveBeenCalled();
    });

    it('khách trả 2 lần cho cùng đơn => giao dịch thứ 2 được hoàn tiền', async () => {
      vi.mocked(orders.fulfillOrder).mockRejectedValue(
        businessError(ErrorCode.ORDER_ALREADY_PROCESSED),
      );
      orderSummary('PAID', 'ORD-1_000'); // giao dịch khác đã chốt đơn

      await service.handleIpn(PaymentMethod.VNPAY, {});

      expect(refunds.refundTransaction).toHaveBeenCalled();
    });

    it('chính giao dịch này đã chốt đơn trước đó => chỉ đánh dấu chốt sổ, KHÔNG hoàn tiền', async () => {
      vi.mocked(orders.fulfillOrder).mockRejectedValue(
        businessError(ErrorCode.ORDER_ALREADY_PROCESSED),
      );
      orderSummary('PAID', TXN_REF);

      const res = await service.handleIpn(PaymentMethod.VNPAY, {});

      expect(res.RspCode).toBe('00');
      expect(repo.markTransactionSettled).toHaveBeenCalledWith(TXN_REF, expect.any(Date));
      expect(refunds.refundTransaction).not.toHaveBeenCalled();
    });

    it('đơn PAID từ trước khi có paid_txn_ref (dữ liệu cũ) => KHÔNG được coi là trả trùng', async () => {
      vi.mocked(orders.fulfillOrder).mockRejectedValue(
        businessError(ErrorCode.ORDER_ALREADY_PROCESSED),
      );
      orderSummary('PAID', null);

      await service.handleIpn(PaymentMethod.VNPAY, {});

      expect(refunds.refundTransaction).not.toHaveBeenCalled();
      expect(repo.markTransactionSettled).toHaveBeenCalledWith(TXN_REF, expect.any(Date));
    });

    it('request khác đang xuất vé (đơn còn PENDING) => 99 để thử lại, KHÔNG hoàn tiền oan', async () => {
      vi.mocked(orders.fulfillOrder).mockRejectedValue(
        businessError(ErrorCode.ORDER_ALREADY_PROCESSED),
      );
      orderSummary('PENDING');

      const res = await service.handleIpn(PaymentMethod.VNPAY, {});

      expect(res).toEqual({ RspCode: '99', Message: 'Unknown error' });
      expect(refunds.refundTransaction).not.toHaveBeenCalled();
      expect(repo.markTransactionSettled).not.toHaveBeenCalled();
    });

    it('lỗi tạm thời (DB mất kết nối) => 99, giữ SUCCESS chưa chốt sổ để đối soát lại', async () => {
      vi.mocked(orders.fulfillOrder).mockRejectedValue(new Error('Connection lost'));

      const res = await service.handleIpn(PaymentMethod.VNPAY, {});

      expect(res.RspCode).toBe('99');
      expect(repo.markTransactionSettled).not.toHaveBeenCalled();
      expect(refunds.refundTransaction).not.toHaveBeenCalled();
    });
  });

  describe('IPN gửi lặp / song song', () => {
    beforeEach(() => ipn());

    it('thua compare-and-set và giao dịch đã chốt sổ => 02, không xử lý lại', async () => {
      vi.mocked(repo.transitionTransaction).mockResolvedValue(false);
      vi.mocked(repo.findTransactionByTxnRef).mockResolvedValue(
        txn({ paymentStatus: PaymentStatus.SUCCESS, settledAt: new Date() }),
      );

      const res = await service.handleIpn(PaymentMethod.VNPAY, {});

      expect(res).toEqual({ RspCode: '02', Message: 'Order already confirmed' });
      expect(orders.fulfillOrder).not.toHaveBeenCalled();
      expect(events.emit).not.toHaveBeenCalled();
    });

    it('lần trước ghi SUCCESS nhưng chốt sổ dở dang => IPN lặp sẽ chốt lại', async () => {
      vi.mocked(repo.transitionTransaction).mockResolvedValue(false);
      vi.mocked(repo.findTransactionByTxnRef).mockResolvedValue(
        txn({ paymentStatus: PaymentStatus.SUCCESS, settledAt: null }),
      );

      await service.handleIpn(PaymentMethod.VNPAY, {});

      expect(orders.fulfillOrder).toHaveBeenCalledWith('order-10', expect.anything(), TXN_REF);
      expect(repo.markTransactionSettled).toHaveBeenCalled();
    });
  });

  describe('thanh toán thất bại', () => {
    it('INITIATED -> FAILED bằng compare-and-set, phát payment.failed', async () => {
      ipn({ isSuccess: false, responseCode: '24' });
      vi.mocked(repo.findTransactionByTxnRef).mockResolvedValue(txn());

      const res = await service.handleIpn(PaymentMethod.VNPAY, {});

      expect(res.RspCode).toBe('00');
      expect(repo.transitionTransaction).toHaveBeenCalledWith(
        TXN_REF,
        PaymentStatus.INITIATED,
        PaymentStatus.FAILED,
        expect.anything(),
      );
      expect(events.emit).toHaveBeenCalledWith('payment.failed', expect.anything());
      expect(orders.fulfillOrder).not.toHaveBeenCalled();
    });
  });

  describe('reconcile (job đối soát)', () => {
    it('chốt sổ giao dịch SUCCESS dở dang và thử lại hoàn tiền', async () => {
      vi.mocked(repo.findUnsettledSuccessful).mockResolvedValue([
        txn({ paymentStatus: PaymentStatus.SUCCESS }),
      ]);
      vi.mocked(repo.findTransactionsByStatus).mockResolvedValue([
        txn({ txnRef: 'R-2', paymentStatus: PaymentStatus.REFUND_PENDING }),
      ]);

      const res = await service.reconcile();

      expect(orders.fulfillOrder).toHaveBeenCalledWith('order-10', expect.anything(), TXN_REF);
      expect(refunds.refundTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ txnRef: 'R-2' }),
      );
      expect(res).toEqual({ settled: 1, refunded: 1 });
    });
  });

  describe('initiate', () => {
    it('link thanh toán không sống quá hạn của đơn', async () => {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      vi.mocked(orders.getOrderSummary).mockResolvedValue({
        id: 10,
        orderCode: 'ORD-1',
        userId: 'u1',
        status: 'PENDING',
        finalAmount: 50000,
        expiresAt,
      } as any);

      await service.initiate('u1', { orderId: 10, method: PaymentMethod.VNPAY } as any);

      expect(gateway.createPaymentUrl).toHaveBeenCalledWith(
        expect.objectContaining({ expiresAt }),
      );
    });
  });
});
