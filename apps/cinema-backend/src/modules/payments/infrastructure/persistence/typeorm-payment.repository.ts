import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, Repository } from 'typeorm';
import { Payment } from '../../domain/entities/payment.entity.js';
import { PaymentTransaction } from '../../domain/entities/payment-transaction.entity.js';
import { PaymentStatus } from '../../domain/enums/payment-status.enum.js';
import type {
  IPaymentRepository,
  TransactionPatch,
} from '../../domain/repositories/payment.repository.interface.js';

@Injectable()
export class TypeOrmPaymentRepository implements IPaymentRepository {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(PaymentTransaction)
    private readonly txnRepo: Repository<PaymentTransaction>,
  ) {}

  async createPayment(payment: Partial<Payment>): Promise<Payment> {
    const entity = this.paymentRepo.create(payment);
    return this.paymentRepo.save(entity);
  }

  async savePayment(payment: Payment): Promise<Payment> {
    return this.paymentRepo.save(payment);
  }

  async findPaymentById(id: string): Promise<Payment | null> {
    return this.paymentRepo.findOne({ where: { id } });
  }

  async findPaymentByOrderId(orderId: string): Promise<Payment | null> {
    return this.paymentRepo.findOne({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });
  }

  async findPaymentByGatewayTxnRef(txnRef: string): Promise<Payment | null> {
    return this.paymentRepo.findOne({
      where: { gatewayTxnRef: txnRef },
      order: { createdAt: 'DESC' },
    });
  }

  async createTransaction(txn: Partial<PaymentTransaction>): Promise<PaymentTransaction> {
    const entity = this.txnRepo.create(txn);
    return this.txnRepo.save(entity);
  }

  async saveTransaction(txn: PaymentTransaction): Promise<PaymentTransaction> {
    return this.txnRepo.save(txn);
  }

  async findTransactionByTxnRef(txnRef: string): Promise<PaymentTransaction | null> {
    return this.txnRepo.findOne({ where: { txnRef } });
  }

  async findTransactionsByOrderId(orderId: string): Promise<PaymentTransaction[]> {
    return this.txnRepo.find({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });
  }

  async transitionTransaction(
    txnRef: string,
    from: PaymentStatus,
    to: PaymentStatus,
    patch: TransactionPatch = {},
  ): Promise<boolean> {
    const result = await this.txnRepo
      .createQueryBuilder()
      .update(PaymentTransaction)
      .set({ ...patch, paymentStatus: to })
      .where('txnRef = :txnRef', { txnRef })
      .andWhere('paymentStatus = :from', { from })
      .execute();
    return (result.affected ?? 0) === 1;
  }

  async markTransactionSettled(txnRef: string, at: Date): Promise<void> {
    await this.txnRepo.update({ txnRef }, { settledAt: at });
  }

  findUnsettledSuccessful(
    paidBefore: Date,
    limit: number,
    paidAfter: Date,
  ): Promise<PaymentTransaction[]> {
    return this.txnRepo.find({
      where: {
        paymentStatus: PaymentStatus.SUCCESS,
        settledAt: IsNull(),
        paidAt: Between(paidAfter, paidBefore),
      },
      order: { paidAt: 'ASC' },
      take: limit,
    });
  }

  findTransactionsByStatus(
    status: PaymentStatus,
    limit: number,
  ): Promise<PaymentTransaction[]> {
    return this.txnRepo.find({
      where: { paymentStatus: status },
      order: { updatedAt: 'ASC' },
      take: limit,
    });
  }
}
