import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PAYMENT_REPOSITORY,
  type IPaymentRepository,
} from '../../domain/repositories/payment.repository.interface.js';
import { PaymentStatus } from '../../domain/enums/payment-status.enum.js';
import { PaymentMethod } from '../../domain/enums/payment-method.enum.js';
import { PaymentSucceededEvent } from '../../domain/events/payment-succeeded.event.js';
import { PaymentFailedEvent } from '../../domain/events/payment-failed.event.js';
import { PaymentGatewayRegistry } from '../../infrastructure/gateways/payment-gateway.registry.js';
import { OrdersFacade } from '#modules/orders/public-api/orders.facade.js';
import { PaymentMethod as OrderPaymentMethod } from '#modules/orders/domain/enums/payment-method.enum.js';
import { InitiatePaymentDto } from '../dto/initiate-payment.dto.js';
import { PaymentResponseDto } from '../dto/payment-response.dto.js';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
    private readonly gatewayRegistry: PaymentGatewayRegistry,
    private readonly ordersFacade: OrdersFacade,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Khởi tạo phiên thanh toán cho một đơn hàng (POST /payments/initiate)
   */
  async initiate(
    userId: string,
    dto: InitiatePaymentDto,
    ipAddress?: string,
  ): Promise<PaymentResponseDto> {
    const orderSummary = await this.ordersFacade.getOrderSummary(dto.orderId);

    if (!orderSummary || String(orderSummary.userId) !== String(userId)) {
      throw new NotFoundException({
        errorCode: 'ORDER_NOT_FOUND',
        message: 'Đơn hàng không tồn tại hoặc không thuộc quyền sở hữu của bạn',
      });
    }

    if (orderSummary.status !== 'PENDING') {
      throw new BadRequestException({
        errorCode: 'ORDER_NOT_PENDING',
        message: `Đơn hàng không ở trạng thái chờ thanh toán (hiện tại: ${orderSummary.status})`,
      });
    }

    if (new Date() > new Date(orderSummary.expiresAt)) {
      throw new BadRequestException({
        errorCode: 'ORDER_EXPIRED',
        message: 'Đơn hàng đã hết hạn thanh toán, vui lòng đặt lại',
      });
    }

    const gateway = this.gatewayRegistry.getGateway(dto.method);
    const amount = Number(orderSummary.finalAmount);
    const gatewayTxnRef = `${orderSummary.orderCode}_${Date.now()}`;

    // Lưu hoặc cập nhật Payment entity
    let payment = await this.paymentRepository.findPaymentByOrderId(
      String(orderSummary.id),
    );
    if (!payment) {
      payment = await this.paymentRepository.createPayment({
        orderId: String(orderSummary.id),
        method: dto.method,
        amount,
        status: PaymentStatus.INITIATED,
        gatewayTxnRef,
      });
    } else {
      payment.method = dto.method;
      payment.amount = amount;
      payment.status = PaymentStatus.INITIATED;
      payment.gatewayTxnRef = gatewayTxnRef;
      await this.paymentRepository.savePayment(payment);
    }

    // Ghi log Transaction
    await this.paymentRepository.createTransaction({
      orderId: String(orderSummary.id),
      txnRef: gatewayTxnRef,
      paymentGateway: dto.method,
      amount,
      paymentStatus: PaymentStatus.INITIATED,
    });

    // Tạo URL qua Gateway Strategy
    const paymentUrl = await gateway.createPaymentUrl({
      orderId: orderSummary.id,
      orderCode: gatewayTxnRef, // VNPay TxnRef
      amount,
      orderInfo: `Thanh toan don hang ${orderSummary.orderCode}`,
      ipAddress,
      returnUrl: dto.returnUrl,
    });

    return {
      orderId: Number(orderSummary.id),
      orderCode: orderSummary.orderCode,
      gatewayTxnRef,
      amount,
      paymentUrl,
    };
  }

  /**
   * Xử lý IPN / Webhook idempotent theo gatewayTxnRef
   */
  async handleIpn(
    method: PaymentMethod,
    query: Record<string, any>,
  ): Promise<{ RspCode: string; Message: string }> {
    const gateway = this.gatewayRegistry.getGateway(method);
    const verifyResult = await gateway.verifyIpn(query);

    this.logger.log(
      `[PaymentsService] Nhận IPN từ ${method}: TxnRef=${verifyResult.gatewayTxnRef}, ResponseCode=${verifyResult.responseCode}, isValid=${verifyResult.isValid}`,
    );

    if (!verifyResult.isValid) {
      this.logger.warn(
        `[PaymentsService] Chữ ký IPN không hợp lệ từ ${method}`,
      );
      return { RspCode: '97', Message: 'Invalid Checksum' };
    }

    const txnRef = verifyResult.gatewayTxnRef;
    const transaction =
      await this.paymentRepository.findTransactionByTxnRef(txnRef);

    if (!transaction) {
      this.logger.warn(
        `[PaymentsService] Không tìm thấy transaction cho TxnRef=${txnRef}`,
      );
      return { RspCode: '01', Message: 'Order not found' };
    }

    // Kiểm tra số tiền
    if (Math.round(transaction.amount) !== Math.round(verifyResult.amount)) {
      this.logger.warn(
        `[PaymentsService] Số tiền không khớp cho TxnRef=${txnRef}: expected ${transaction.amount}, got ${verifyResult.amount}`,
      );
      return { RspCode: '04', Message: 'Invalid amount' };
    }

    // Idempotent: Nếu transaction đã xử lý trước đó rồi thì bỏ qua
    if (transaction.paymentStatus !== PaymentStatus.INITIATED) {
      this.logger.log(
        `[PaymentsService] Giao dịch ${txnRef} đã được xử lý trước đó`,
      );
      return { RspCode: '02', Message: 'Order already confirmed' };
    }

    const payment = await this.paymentRepository.findPaymentByOrderId(
      transaction.orderId,
    );

    if (verifyResult.isSuccess) {
      // 1. Cập nhật transaction thành SUCCESS
      transaction.paymentStatus = PaymentStatus.SUCCESS;
      transaction.transactionNo = verifyResult.transactionNo;
      transaction.responseCode = verifyResult.responseCode;
      transaction.gatewayPayload = verifyResult.rawPayload;
      transaction.paidAt = new Date();
      await this.paymentRepository.saveTransaction(transaction);

      // 2. Cập nhật payment entity
      if (payment) {
        payment.status = PaymentStatus.SUCCESS;
        payment.gatewayTxnRef = txnRef;
        await this.paymentRepository.savePayment(payment);
      }

      // 3. Fulfill đơn hàng qua OrdersFacade
      const orderPaymentMethod =
        method === PaymentMethod.VNPAY
          ? OrderPaymentMethod.VNPAY
          : method === PaymentMethod.MOMO
            ? OrderPaymentMethod.MOMO
            : OrderPaymentMethod.CARD;

      await this.ordersFacade.fulfillOrder(
        transaction.orderId,
        orderPaymentMethod,
      );

      // 4. Phát Domain Event
      this.eventEmitter.emit(
        'payment.succeeded',
        new PaymentSucceededEvent(
          payment ? payment.id : transaction.id,
          transaction.orderId,
          transaction.amount,
          method,
          txnRef,
        ),
      );

      this.logger.log(
        `[PaymentsService] Đã xử lý thanh toán thành công cho đơn hàng ID: ${transaction.orderId}`,
      );
      return { RspCode: '00', Message: 'Confirm Success' };
    } else {
      // Cập nhật transaction thành FAILED
      transaction.paymentStatus = PaymentStatus.FAILED;
      transaction.transactionNo = verifyResult.transactionNo;
      transaction.responseCode = verifyResult.responseCode;
      transaction.gatewayPayload = verifyResult.rawPayload;
      await this.paymentRepository.saveTransaction(transaction);

      if (payment) {
        payment.status = PaymentStatus.FAILED;
        await this.paymentRepository.savePayment(payment);
      }

      // Phát Domain Event
      this.eventEmitter.emit(
        'payment.failed',
        new PaymentFailedEvent(
          transaction.orderId,
          transaction.amount,
          method,
          txnRef,
          verifyResult.message,
        ),
      );

      this.logger.log(
        `[PaymentsService] Giao dịch thất bại cho đơn hàng ID: ${transaction.orderId}, mã lỗi: ${verifyResult.responseCode}`,
      );
      return { RspCode: '00', Message: 'Confirm Success' };
    }
  }

  /**
   * Lấy chi tiết thanh toán của đơn hàng
   */
  async getPaymentByOrderId(orderId: string | number) {
    const payment = await this.paymentRepository.findPaymentByOrderId(
      String(orderId),
    );
    const transactions = await this.paymentRepository.findTransactionsByOrderId(
      String(orderId),
    );

    return {
      payment,
      transactions,
    };
  }
}
