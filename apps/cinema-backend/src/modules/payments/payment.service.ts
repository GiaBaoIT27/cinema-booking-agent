import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentTransaction } from './entities/payment-transaction.entity.js';
import { PaymentGateway } from './enums/payment-gateway.enum.js';
import { PaymentTransactionStatus } from './enums/payment-transaction-status.enum.js';
import { OrderService } from '#modules/orders/services/order.service.js';
import { Order } from '#modules/orders/entities/order.entity.js';
import { OrderStatus } from '#modules/orders/enums/order-status.enum.js';
import { PaymentMethod } from '#modules/orders/enums/payment-method.enum.js';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepository: Repository<PaymentTransaction>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly orderService: OrderService,
  ) {}

  /**
   * Tạo URL thanh toán cho đơn hàng PENDING.
   * Bản chất là tạo 1 phiên giao dịch (PaymentTransaction) và trả về link redirect cổng thanh toán.
   */
  async createPaymentUrl(
    userId: string,
    orderId: number,
    gateway: PaymentGateway = PaymentGateway.MOCK,
  ) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId.toString() },
    });

    if (!order || order.userId !== userId) {
      throw new NotFoundException({
        errorCode: 'ORDER_NOT_FOUND',
        message: 'Đơn hàng không tồn tại',
      });
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException({
        errorCode: 'ORDER_NOT_PENDING',
        message: `Đơn hàng không ở trạng thái chờ thanh toán (hiện tại: ${order.status})`,
      });
    }

    if (new Date() > new Date(order.expiresAt)) {
      throw new BadRequestException({
        errorCode: 'ORDER_EXPIRED',
        message: 'Đơn hàng đã hết hạn thanh toán, vui lòng đặt lại',
      });
    }

    const txnRef = `${order.orderCode}_${Date.now()}`;
    const amount = Number(order.finalAmount);

    const transaction = this.paymentTransactionRepository.create({
      orderId: order.id,
      txnRef,
      paymentGateway: gateway,
      amount,
      paymentStatus: PaymentTransactionStatus.INITIATED,
    });

    await this.paymentTransactionRepository.save(transaction);

    let paymentUrl = '';
    if (gateway === PaymentGateway.MOCK) {
      // Tạo một URL giả lập callback thành công luôn để dễ test
      paymentUrl = `/api/v1/payments/mock/callback?txnRef=${txnRef}&status=00`;
    } else {
      // TODO: Tích hợp SDK VNPAY, MOMO thực tế tại đây
      paymentUrl = `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=${txnRef}&...`;
    }

    return {
      orderId: Number(order.id),
      orderCode: order.orderCode,
      txnRef,
      amount,
      paymentUrl,
    };
  }

  /**
   * Xử lý IPN/Webhook hoặc Callback từ cổng thanh toán.
   * Nếu thanh toán thành công (status = 00), gọi OrderService để sinh vé thật (Ticket) và chốt ghế (BOOKED).
   */
  async processMockCallback(txnRef: string, status: string) {
    const transaction = await this.paymentTransactionRepository.findOne({
      where: { txnRef },
    });

    if (!transaction) {
      throw new NotFoundException({
        errorCode: 'TRANSACTION_NOT_FOUND',
        message: 'Giao dịch thanh toán không tồn tại',
      });
    }

    if (transaction.paymentStatus !== PaymentTransactionStatus.INITIATED) {
      return {
        success: transaction.paymentStatus === PaymentTransactionStatus.SUCCESS,
        message: 'Giao dịch đã được xử lý trước đó',
        status: transaction.paymentStatus,
      };
    }

    if (status === '00') {
      // 1. Cập nhật transaction thành SUCCESS
      transaction.paymentStatus = PaymentTransactionStatus.SUCCESS;
      transaction.paidAt = new Date();
      transaction.responseCode = status;
      await this.paymentTransactionRepository.save(transaction);

      // 2. Chốt đơn hàng & Sinh vé thật
      // Mapping Gateway -> PaymentMethod
      let method = PaymentMethod.CARD;
      if (transaction.paymentGateway === PaymentGateway.VNPAY)
        method = PaymentMethod.VNPAY;
      if (transaction.paymentGateway === PaymentGateway.MOMO)
        method = PaymentMethod.MOMO;
      if (transaction.paymentGateway === PaymentGateway.MOCK)
        method = PaymentMethod.VNPAY;

      // Gọi fulfillOrder để sinh Ticket và chuyển ghế sang BOOKED
      await this.orderService.fulfillOrder(Number(transaction.orderId), method);

      this.logger.log(
        `[Payment] Đã xử lý thanh toán thành công cho đơn hàng ID: ${transaction.orderId}`,
      );

      return {
        success: true,
        message: 'Thanh toán thành công. Đã xuất vé và chốt ghế.',
        orderId: Number(transaction.orderId),
      };
    } else {
      // Cập nhật transaction thành FAILED
      transaction.paymentStatus = PaymentTransactionStatus.FAILED;
      transaction.responseCode = status;
      await this.paymentTransactionRepository.save(transaction);

      this.logger.log(
        `[Payment] Giao dịch thất bại cho đơn hàng ID: ${transaction.orderId}`,
      );

      return {
        success: false,
        message: 'Thanh toán thất bại hoặc đã bị hủy.',
      };
    }
  }
}
