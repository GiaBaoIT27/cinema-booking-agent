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
import type { PaymentTransaction } from '../../domain/entities/payment-transaction.entity.js';
import { PaymentStatus } from '../../domain/enums/payment-status.enum.js';
import { PaymentMethod } from '../../domain/enums/payment-method.enum.js';
import { PaymentSucceededEvent } from '../../domain/events/payment-succeeded.event.js';
import { PaymentFailedEvent } from '../../domain/events/payment-failed.event.js';
import { PaymentGatewayRegistry } from '../../infrastructure/gateways/payment-gateway.registry.js';
import { OrdersFacade } from '#modules/orders/public-api/orders.facade.js';
import { PaymentMethod as OrderPaymentMethod } from '#modules/orders/domain/enums/payment-method.enum.js';
import { ErrorCode } from '#src/common/constants/error-codes.enum.js';
import { InitiatePaymentDto } from '../dto/initiate-payment.dto.js';
import { PaymentResponseDto } from '../dto/payment-response.dto.js';
import { RefundService } from './refund.service.js';

type IpnResponse = { RspCode: string; Message: string };

/** Kết quả "chốt sổ" một giao dịch đã thu tiền thành công. */
export type SettleOutcome =
  /** Đơn đã PAID + xuất vé nhờ giao dịch này. */
  | 'FULFILLED'
  /** Giao dịch này đã chốt đơn từ trước (request lặp). */
  | 'ALREADY_SETTLED'
  /** Không xuất được vé => đã chuyển sang hoàn tiền. */
  | 'REFUND'
  /** Lỗi tạm thời / đang có request khác xử lý => thử lại sau (IPN trả 99, job đối soát). */
  | 'RETRY';

/** Giao dịch SUCCESS chưa chốt sổ quá thời gian này mới bị job đối soát xử lý lại. */
const RECONCILE_GRACE_MS = 60 * 1000;
const RECONCILE_BATCH = 50;
/**
 * Chỉ tự động đối soát giao dịch trong khoảng này. Giao dịch cũ hơn mà vẫn chưa chốt sổ
 * là bất thường (hoặc dữ liệu trước khi có settled_at) => để người vận hành xử lý tay,
 * job không tự ý xuất vé/hoàn tiền.
 */
const RECONCILE_LOOKBACK_MS = 3 * 24 * 60 * 60 * 1000;

const IPN_OK: IpnResponse = { RspCode: '00', Message: 'Confirm Success' };
const IPN_ALREADY: IpnResponse = {
  RspCode: '02',
  Message: 'Order already confirmed',
};
const IPN_RETRY: IpnResponse = { RspCode: '99', Message: 'Unknown error' };

function errorCodeOf(error: unknown): string | undefined {
  return (error as { errorCode?: string } | null)?.errorCode;
}

function toOrderPaymentMethod(method: PaymentMethod): OrderPaymentMethod {
  if (method === PaymentMethod.VNPAY) return OrderPaymentMethod.VNPAY;
  if (method === PaymentMethod.MOMO) return OrderPaymentMethod.MOMO;
  return OrderPaymentMethod.CARD;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
    private readonly gatewayRegistry: PaymentGatewayRegistry,
    private readonly ordersFacade: OrdersFacade,
    private readonly eventEmitter: EventEmitter2,
    private readonly refundService: RefundService,
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

    const expiresAt = new Date(orderSummary.expiresAt);
    if (new Date() > expiresAt) {
      throw new BadRequestException({
        errorCode: 'ORDER_EXPIRED',
        message: 'Đơn hàng đã hết hạn thanh toán, vui lòng đặt lại',
      });
    }

    const gateway = this.gatewayRegistry.getGateway(dto.method);
    const amount = Number(orderSummary.finalAmount);
    const gatewayTxnRef = `${orderSummary.orderCode}_${Date.now()}`;

    // Lưu hoặc cập nhật Payment entity (bản tóm tắt lần thanh toán gần nhất của đơn)
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

    // Mỗi lần thanh toán là một transaction riêng (txnRef duy nhất) – nguồn sự thật về tiền
    await this.paymentRepository.createTransaction({
      orderId: String(orderSummary.id),
      txnRef: gatewayTxnRef,
      paymentGateway: dto.method,
      amount,
      paymentStatus: PaymentStatus.INITIATED,
    });

    const paymentUrl = await gateway.createPaymentUrl({
      orderId: orderSummary.id,
      orderCode: gatewayTxnRef, // VNPay TxnRef
      amount,
      orderInfo: `Thanh toan don hang ${orderSummary.orderCode}`,
      ipAddress,
      returnUrl: dto.returnUrl,
      expiresAt,
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
   * Xử lý IPN / Webhook – an toàn khi cổng gửi lặp hoặc gửi song song (IPN + return URL).
   *
   * Khóa idempotency là bước chuyển trạng thái nguyên tử INITIATED -> SUCCESS/FAILED của
   * transaction (compare-and-set): với một txnRef chỉ đúng một request thắng. Sau đó giao dịch
   * thành công được "chốt sổ" (settle): xuất vé, hoặc chuyển hoàn tiền nếu không xuất được.
   *
   * Mã trả về cho VNPay: 00 đã xử lý xong; 02 đã xử lý trước đó; 99 lỗi tạm thời => VNPay
   * gọi lại; 97 sai chữ ký; 01 không có giao dịch; 04 sai số tiền.
   */
  async handleIpn(
    method: PaymentMethod,
    query: Record<string, any>,
  ): Promise<IpnResponse> {
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

    if (Math.round(transaction.amount) !== Math.round(verifyResult.amount)) {
      this.logger.warn(
        `[PaymentsService] Số tiền không khớp cho TxnRef=${txnRef}: expected ${transaction.amount}, got ${verifyResult.amount}`,
      );
      return { RspCode: '04', Message: 'Invalid amount' };
    }

    const gatewayFields = {
      transactionNo: verifyResult.transactionNo,
      responseCode: verifyResult.responseCode,
      gatewayPayload: verifyResult.rawPayload,
    };

    // ── Giao dịch thất bại ────────────────────────────────────────────────
    if (!verifyResult.isSuccess) {
      const won = await this.paymentRepository.transitionTransaction(
        txnRef,
        PaymentStatus.INITIATED,
        PaymentStatus.FAILED,
        gatewayFields,
      );
      if (!won) {
        this.logger.log(
          `[PaymentsService] Giao dịch ${txnRef} đã được xử lý trước đó`,
        );
        return IPN_ALREADY;
      }

      await this.syncPaymentSummary(
        transaction.orderId,
        txnRef,
        PaymentStatus.FAILED,
      );
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
      return IPN_OK;
    }

    // ── Giao dịch thành công: tiền đã bị trừ, ghi nhận SUCCESS trước rồi mới chốt sổ ──
    const won = await this.paymentRepository.transitionTransaction(
      txnRef,
      PaymentStatus.INITIATED,
      PaymentStatus.SUCCESS,
      { ...gatewayFields, paidAt: new Date() },
    );

    if (!won) {
      // Đã ghi nhận trước đó. Nếu lần trước chốt sổ dở dang (lỗi tạm thời) thì chốt lại.
      const latest = await this.paymentRepository.findTransactionByTxnRef(txnRef);
      if (
        latest?.paymentStatus === PaymentStatus.SUCCESS &&
        !latest.settledAt
      ) {
        const outcome = await this.settleSuccessfulTransaction(latest, method);
        if (outcome === 'RETRY') return IPN_RETRY;
      }
      this.logger.log(
        `[PaymentsService] Giao dịch ${txnRef} đã được xử lý trước đó`,
      );
      return IPN_ALREADY;
    }

    await this.syncPaymentSummary(
      transaction.orderId,
      txnRef,
      PaymentStatus.SUCCESS,
    );

    const outcome = await this.settleSuccessfulTransaction(
      { ...transaction, paymentStatus: PaymentStatus.SUCCESS },
      method,
    );
    return outcome === 'RETRY' ? IPN_RETRY : IPN_OK;
  }

  /**
   * "Chốt sổ" một giao dịch đã thu tiền: xuất vé cho đơn; nếu không thể (đơn đã hết hạn/hủy,
   * ghế không còn, hoặc đơn đã được giao dịch khác thanh toán) thì chuyển sang hoàn tiền.
   * Không bao giờ để tình trạng "đã trừ tiền mà không có vé, cũng không hoàn tiền".
   */
  async settleSuccessfulTransaction(
    txn: PaymentTransaction,
    method: PaymentMethod = txn.paymentGateway as PaymentMethod,
  ): Promise<SettleOutcome> {
    const { txnRef, orderId } = txn;

    try {
      await this.ordersFacade.fulfillOrder(
        orderId,
        toOrderPaymentMethod(method),
        txnRef,
      );
    } catch (error) {
      const code = errorCodeOf(error);

      if (code === ErrorCode.ORDER_SEATS_NO_LONGER_AVAILABLE) {
        await this.requestRefund(txn, 'Ghế của đơn không còn được giữ');
        return 'REFUND';
      }

      if (
        code === ErrorCode.ORDER_ALREADY_PROCESSED ||
        code === ErrorCode.ORDER_NOT_FOUND
      ) {
        const order = await this.ordersFacade.getOrderSummary(orderId);

        if (
          order?.status === 'PAID' &&
          (order.paidTxnRef === txnRef || order.paidTxnRef === null)
        ) {
          // Chính giao dịch này đã chốt đơn (request lặp / lần trước chưa kịp đánh dấu).
          // paidTxnRef = null: đơn PAID từ TRƯỚC khi có cột này – không đủ dữ kiện để kết luận
          // trả trùng, tuyệt đối không tự hoàn tiền (để đối soát thủ công nếu cần).
          await this.paymentRepository.markTransactionSettled(txnRef, new Date());
          return 'ALREADY_SETTLED';
        }
        if (order?.status === 'PENDING') {
          // Một request khác đang xuất vé cho đơn – để nó hoàn tất, lần sau đối soát lại
          return 'RETRY';
        }

        const reason =
          order?.status === 'PAID'
            ? `Đơn đã được thanh toán bởi giao dịch khác (${order.paidTxnRef ?? 'không rõ'}) – trả trùng`
            : `Đơn không còn chờ thanh toán (trạng thái: ${order?.status ?? 'không tồn tại'})`;
        await this.requestRefund(txn, reason);
        return 'REFUND';
      }

      this.logger.error(
        `[PaymentsService] Lỗi tạm thời khi xuất vé cho đơn ${orderId} (TxnRef=${txnRef}), sẽ thử lại: ${String(error)}`,
      );
      return 'RETRY';
    }

    await this.paymentRepository.markTransactionSettled(txnRef, new Date());
    const payment = await this.paymentRepository.findPaymentByOrderId(orderId);
    this.eventEmitter.emit(
      'payment.succeeded',
      new PaymentSucceededEvent(
        payment ? payment.id : txn.id,
        orderId,
        txn.amount,
        method,
        txnRef,
      ),
    );
    this.logger.log(
      `[PaymentsService] Đã xử lý thanh toán thành công cho đơn hàng ID: ${orderId}`,
    );
    return 'FULFILLED';
  }

  /**
   * SUCCESS -> REFUND_PENDING (nguyên tử), đánh dấu đã chốt sổ rồi thử hoàn tiền ngay.
   * Cổng lỗi thì giao dịch nằm lại REFUND_PENDING để job đối soát thử lại.
   */
  private async requestRefund(
    txn: PaymentTransaction,
    reason: string,
  ): Promise<void> {
    const moved = await this.paymentRepository.transitionTransaction(
      txn.txnRef,
      PaymentStatus.SUCCESS,
      PaymentStatus.REFUND_PENDING,
    );
    if (!moved) return;

    await this.paymentRepository.markTransactionSettled(txn.txnRef, new Date());
    await this.syncPaymentSummary(
      txn.orderId,
      txn.txnRef,
      PaymentStatus.REFUND_PENDING,
    );
    this.logger.error(
      `[PaymentsService] Đã thu ${txn.amount} cho đơn ${txn.orderId} (TxnRef=${txn.txnRef}) nhưng không xuất được vé: ${reason}. Chuyển sang hoàn tiền.`,
    );

    await this.refundService.refundTransaction(
      { ...txn, paymentStatus: PaymentStatus.REFUND_PENDING },
      reason,
    );
  }

  /**
   * Đối soát định kỳ (gọi bởi job bảo trì):
   *  1. Giao dịch SUCCESS chưa chốt sổ quá 1 phút (IPN lỗi giữa chừng, server restart…) => chốt lại.
   *  2. Giao dịch REFUND_PENDING => thử hoàn tiền lại.
   */
  async reconcile(): Promise<{ settled: number; refunded: number }> {
    let settled = 0;
    let refunded = 0;

    const now = Date.now();
    const unsettled = await this.paymentRepository.findUnsettledSuccessful(
      new Date(now - RECONCILE_GRACE_MS),
      RECONCILE_BATCH,
      new Date(now - RECONCILE_LOOKBACK_MS),
    );
    for (const txn of unsettled) {
      try {
        const outcome = await this.settleSuccessfulTransaction(txn);
        if (outcome !== 'RETRY') settled++;
      } catch (error) {
        this.logger.error(
          `[Reconcile] Lỗi chốt sổ TxnRef=${txn.txnRef}: ${String(error)}`,
        );
      }
    }

    const refundQueue = await this.paymentRepository.findTransactionsByStatus(
      PaymentStatus.REFUND_PENDING,
      RECONCILE_BATCH,
    );
    for (const txn of refundQueue) {
      if (await this.refundService.refundTransaction(txn)) refunded++;
    }

    if (settled > 0 || refunded > 0) {
      this.logger.log(
        `[Reconcile] Chốt sổ ${settled} giao dịch, hoàn tiền ${refunded} giao dịch`,
      );
    }
    return { settled, refunded };
  }

  /** Cập nhật bản tóm tắt Payment – chỉ khi nó đang trỏ tới đúng giao dịch này. */
  private async syncPaymentSummary(
    orderId: string,
    txnRef: string,
    status: PaymentStatus,
  ): Promise<void> {
    const payment = await this.paymentRepository.findPaymentByOrderId(orderId);
    if (!payment || payment.gatewayTxnRef !== txnRef) return;
    payment.status = status;
    await this.paymentRepository.savePayment(payment);
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
