import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Check,
} from 'typeorm';
import { PaymentMethod } from '../enums/payment-method.enum.js';
import { PaymentStatus } from '../enums/payment-status.enum.js';
import { ColumnNumericTransformer } from '#src/common/transformers/numeric.transformer.js';

@Entity('payment_transactions')
@Check(`"amount" >= 0.00`)
export class PaymentTransaction {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id: string;

  @Index('idx_payment_transactions_order_id')
  @Column({
    type: 'bigint',
    nullable: false,
    name: 'order_id',
  })
  orderId: string;

  @Index('idx_payment_transactions_txn_ref_unique', { unique: true })
  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
    nullable: false,
    name: 'txn_ref',
  })
  txnRef: string;

  @Column({
    type: 'varchar',
    length: 30,
    nullable: false,
    enum: PaymentMethod,
    name: 'payment_gateway',
  })
  paymentGateway: PaymentMethod;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'transaction_no',
  })
  transactionNo: string | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: false,
    name: 'amount',
    transformer: new ColumnNumericTransformer(),
  })
  amount: number;

  @Index('idx_payment_transactions_status')
  @Column({
    type: 'varchar',
    length: 30,
    nullable: false,
    enum: PaymentStatus,
    default: PaymentStatus.INITIATED,
    name: 'payment_status',
  })
  paymentStatus: PaymentStatus;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    name: 'response_code',
  })
  responseCode: string | null;

  @Column({
    type: 'jsonb',
    nullable: true,
    name: 'gateway_payload',
  })
  gatewayPayload: Record<string, any> | null;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'created_at',
  })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'paid_at',
  })
  paidAt: Date | null;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
    name: 'updated_at',
  })
  updatedAt: Date;
}
