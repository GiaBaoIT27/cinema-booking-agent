import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RefundService } from './refund.service.js';
import { PaymentStatus } from '../../domain/enums/payment-status.enum.js';
import { PaymentMethod } from '../../domain/enums/payment-method.enum.js';
import type { IPaymentRepository } from '../../domain/repositories/payment.repository.interface.js';
import type { PaymentGatewayRegistry } from '../../infrastructure/gateways/payment-gateway.registry.js';

describe('RefundService.refundTransaction', () => {
  let repo: IPaymentRepository;
  let gateway: { refund: ReturnType<typeof vi.fn> };
  let service: RefundService;

  const txn = (status = PaymentStatus.REFUND_PENDING) =>
    ({
      orderId: 'order-10',
      txnRef: 'T-1',
      transactionNo: 'vnp-1',
      amount: 50000,
      paymentGateway: PaymentMethod.VNPAY,
      paymentStatus: status,
    }) as any;

  beforeEach(() => {
    repo = {
      transitionTransaction: vi.fn().mockResolvedValue(true),
      findPaymentByOrderId: vi.fn().mockResolvedValue({ gatewayTxnRef: 'T-1' }),
      savePayment: vi.fn(),
    } as unknown as IPaymentRepository;
    gateway = { refund: vi.fn() };
    service = new RefundService(repo, {
      getGateway: vi.fn().mockReturnValue(gateway),
    } as unknown as PaymentGatewayRegistry);
  });

  it('cổng hoàn tiền thành công => REFUND_PENDING -> REFUNDED', async () => {
    gateway.refund.mockResolvedValue({ success: true, responseCode: '00', message: 'ok' });

    expect(await service.refundTransaction(txn())).toBe(true);
    expect(gateway.refund).toHaveBeenCalledWith(
      expect.objectContaining({ gatewayTxnRef: 'T-1', transactionNo: 'vnp-1', amount: 50000 }),
    );
    expect(repo.transitionTransaction).toHaveBeenCalledWith(
      'T-1',
      PaymentStatus.REFUND_PENDING,
      PaymentStatus.REFUNDED,
    );
    expect(repo.savePayment).toHaveBeenCalledWith(
      expect.objectContaining({ status: PaymentStatus.REFUNDED }),
    );
  });

  it('cổng từ chối hoặc lỗi mạng => giữ REFUND_PENDING để job thử lại', async () => {
    gateway.refund.mockResolvedValueOnce({ success: false, responseCode: '91', message: 'x' });
    expect(await service.refundTransaction(txn())).toBe(false);

    gateway.refund.mockRejectedValueOnce(new Error('timeout'));
    expect(await service.refundTransaction(txn())).toBe(false);

    expect(repo.transitionTransaction).not.toHaveBeenCalled();
  });

  it('không hoàn tiền giao dịch không ở REFUND_PENDING', async () => {
    expect(await service.refundTransaction(txn(PaymentStatus.SUCCESS))).toBe(false);
    expect(gateway.refund).not.toHaveBeenCalled();
  });
});
