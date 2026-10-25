import { Injectable, Inject, Logger } from '@nestjs/common';
import { PaymentGatewayRegistry } from '../../infrastructure/gateways/payment-gateway.registry.js';
import { PaymentMethod } from '../../domain/enums/payment-method.enum.js';
import {
  type IPaymentRepository,
  PAYMENT_REPOSITORY,
} from '../../domain/repositories/payment.repository.interface.js';
import { PaymentStatus } from '../../domain/enums/payment-status.enum.js';

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
    private readonly gatewayRegistry: PaymentGatewayRegistry,
  ) {}

  async refund(orderId: string | number, reason?: string) {
    const payment = await this.paymentRepository.findPaymentByOrderId(String(orderId));
    if (!payment) {
      throw new Error(`Không tìm thấy thanh toán cho đơn hàng ${orderId}`);
    }

    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new Error(`Đơn hàng chưa thanh toán thành công, không thể hoàn tiền`);
    }

    const gateway = this.gatewayRegistry.getGateway(payment.method);
    const result = await gateway.refund({
      orderId,
      gatewayTxnRef: payment.gatewayTxnRef || '',
      amount: payment.amount,
      reason,
    });

    if (result.success) {
      payment.status = PaymentStatus.REFUNDED;
      await this.paymentRepository.savePayment(payment);
    }

    return result;
  }
}
