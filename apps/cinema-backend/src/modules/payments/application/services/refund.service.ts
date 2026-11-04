import { Injectable, Inject, Logger } from '@nestjs/common';
import { PaymentGatewayRegistry } from '../../infrastructure/gateways/payment-gateway.registry.js';
import { PaymentMethod } from '../../domain/enums/payment-method.enum.js';
import {
  type IPaymentRepository,
  PAYMENT_REPOSITORY,
} from '../../domain/repositories/payment.repository.interface.js';
import { PaymentStatus } from '../../domain/enums/payment-status.enum.js';
import type { PaymentTransaction } from '../../domain/entities/payment-transaction.entity.js';

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
    private readonly gatewayRegistry: PaymentGatewayRegistry,
  ) {}

  /**
   * Hoàn tiền MỘT giao dịch đang REFUND_PENDING qua cổng thanh toán.
   * An toàn khi gọi lặp (job định kỳ thử lại): chỉ giao dịch còn REFUND_PENDING mới được
   * chuyển sang REFUNDED; cổng lỗi => giữ nguyên REFUND_PENDING để lần sau thử lại.
   * @returns true nếu đã hoàn tiền xong.
   */
  async refundTransaction(
    txn: PaymentTransaction,
    reason?: string,
  ): Promise<boolean> {
    if (txn.paymentStatus !== PaymentStatus.REFUND_PENDING) return false;

    const gateway = this.gatewayRegistry.getGateway(
      txn.paymentGateway as PaymentMethod,
    );

    let success = false;
    try {
      const result = await gateway.refund({
        orderId: txn.orderId,
        gatewayTxnRef: txn.txnRef,
        transactionNo: txn.transactionNo ?? undefined,
        amount: Number(txn.amount),
        reason,
      });
      success = result.success;
      if (!success) {
        this.logger.warn(
          `[Refund] Cổng từ chối hoàn tiền TxnRef=${txn.txnRef}: ${result.responseCode} ${result.message}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `[Refund] Lỗi gọi cổng hoàn tiền TxnRef=${txn.txnRef}: ${String(error)}`,
      );
    }
    if (!success) return false;

    const done = await this.paymentRepository.transitionTransaction(
      txn.txnRef,
      PaymentStatus.REFUND_PENDING,
      PaymentStatus.REFUNDED,
    );
    if (done) {
      const payment = await this.paymentRepository.findPaymentByOrderId(
        txn.orderId,
      );
      if (payment && payment.gatewayTxnRef === txn.txnRef) {
        payment.status = PaymentStatus.REFUNDED;
        await this.paymentRepository.savePayment(payment);
      }
      this.logger.log(
        `[Refund] Đã hoàn ${txn.amount} cho đơn ${txn.orderId} (TxnRef=${txn.txnRef})`,
      );
    }
    return done;
  }
}
