import { Payment } from '../entities/payment.entity.js';
import { PaymentTransaction } from '../entities/payment-transaction.entity.js';

export const PAYMENT_REPOSITORY = Symbol('PAYMENT_REPOSITORY');

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
}

