import { Injectable, Inject } from '@nestjs/common';
import {
  PAYMENT_REPOSITORY,
  type IPaymentRepository,
} from '../domain/repositories/payment.repository.interface.js';
import type { PaymentStatusDto } from './dto/payment-status.dto.js';
import { PaymentsService } from '../application/services/payments.service.js';

@Injectable()
export class PaymentsFacade {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * Đối soát thanh toán (gọi bởi job bảo trì): chốt sổ giao dịch SUCCESS còn dở dang
   * và thử lại các giao dịch chờ hoàn tiền.
   */
  reconcilePayments(): Promise<{ settled: number; refunded: number }> {
    return this.paymentsService.reconcile();
  }

  async getPaymentStatus(
    orderId: string | number,
  ): Promise<PaymentStatusDto | null> {
    const payment = await this.paymentRepository.findPaymentByOrderId(
      String(orderId),
    );
    if (!payment) return null;

    return {
      orderId: String(payment.orderId),
      status: payment.status,
      method: payment.method,
      amount: Number(payment.amount),
      paidAt: payment.updatedAt,
      transactionRef: payment.gatewayTxnRef,
    };
  }
}
