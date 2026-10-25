import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Check,
} from 'typeorm';
import { PaymentStatus } from '../enums/payment-status.enum.js';
import { PaymentMethod } from '../enums/payment-method.enum.js';
import { ColumnNumericTransformer } from '#src/common/transformers/numeric.transformer.js';

@Entity('payments')
@Check(`"amount" >= 0.00`)
export class Payment {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id: string;

  @Index('idx_payments_order_id')
  @Column({
    type: 'bigint',
    nullable: false,
    name: 'order_id',
  })
  orderId: string;

  @Column({
    type: 'varchar',
    length: 30,
    nullable: false,
    enum: PaymentMethod,
    name: 'method',
  })
  method: PaymentMethod;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: false,
    name: 'amount',
    transformer: new ColumnNumericTransformer(),
  })
  amount: number;

  @Index('idx_payments_status')
  @Column({
    type: 'varchar',
    length: 30,
    nullable: false,
    enum: PaymentStatus,
    default: PaymentStatus.INITIATED,
    name: 'status',
  })
  status: PaymentStatus;

  @Index('idx_payments_gateway_txn_ref')
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'gateway_txn_ref',
  })
  gatewayTxnRef: string | null;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
    name: 'updated_at',
  })
  updatedAt: Date;
}

