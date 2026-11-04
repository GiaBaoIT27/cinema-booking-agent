import { Payment } from '../entities/payment.entity.js';
import { PaymentTransaction } from '../entities/payment-transaction.entity.js';
import { PaymentStatus } from '../enums/payment-status.enum.js';

export const PAYMENT_REPOSITORY = Symbol('PAYMENT_REPOSITORY');

/** Các trường được phép cập nhật cùng lúc chuyển trạng thái giao dịch. */
export type TransactionPatch = Partial<
  Pick<
    PaymentTransaction,
    'transactionNo' | 'responseCode' | 'gatewayPayload' | 'paidAt'
  >
>;

export interface IPaymentRepository {
  createPayment(payment: Partial<Payment>): Promise<Payment>;
  savePayment(payment: Payment): Promise<Payment>;
  findPaymentById(id: string): Promise<Payment | null>;
  findPaymentByOrderId(orderId: string): Promise<Payment | null>;
  findPaymentByGatewayTxnRef(txnRef: string): Promise<Payment | null>;

  createTransaction(txn: Partial<PaymentTransaction>): Promise<PaymentTransaction>;
  saveTransaction(txn: PaymentTransaction): Promise<PaymentTransaction>;
  findTransactionByTxnRef(txnRef: string): Promise<PaymentTransaction | null>;
  findTransactionsByOrderId(orderId: string): Promise<PaymentTransaction[]>;

  /**
   * Chuyển trạng thái giao dịch nguyên tử (compare-and-set): chỉ cập nhật khi đang ở `from`.
   * Đây là "khóa" idempotency: với cùng một txnRef chỉ đúng MỘT request thắng.
   * @returns false nếu giao dịch không còn ở trạng thái `from`.
   */
  transitionTransaction(
    txnRef: string,
    from: PaymentStatus,
    to: PaymentStatus,
    patch?: TransactionPatch,
  ): Promise<boolean>;

  /** Đánh dấu giao dịch đã được chốt sổ (xuất vé xong hoặc đã chuyển hoàn tiền). */
  markTransactionSettled(txnRef: string, at: Date): Promise<void>;

  /** Giao dịch SUCCESS chưa chốt sổ, thanh toán trong (`paidAfter`, `paidBefore`) – cần đối soát lại. */
  findUnsettledSuccessful(
    paidBefore: Date,
    limit: number,
    paidAfter: Date,
  ): Promise<PaymentTransaction[]>;

  /** Giao dịch theo trạng thái, cũ nhất trước. */
  findTransactionsByStatus(
    status: PaymentStatus,
    limit: number,
  ): Promise<PaymentTransaction[]>;
}
