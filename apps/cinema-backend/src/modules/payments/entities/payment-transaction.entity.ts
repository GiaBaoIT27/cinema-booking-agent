import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Check,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from '#modules/orders/entities/order.entity.js'; // Thay đổi đường dẫn thực tế của bạn
import { PaymentGateway } from '../enums/payment-gateway.enum.js';
import { PaymentTransactionStatus } from '../enums/payment-transaction-status.enum.js';
import { ColumnNumericTransformer } from '#src/common/transformers/numeric.transformer.js';

@Entity('payment_transactions')
// Ràng buộc số tiền giao dịch không được âm
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
    type: 'varchar', // Bản thiết kế ghi kiểu txn_ref, thường là chuỗi mã duy nhất sinh ra cho mỗi lượt click
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
    enum: PaymentGateway,
    name: 'payment_gateway',
  })
  paymentGateway: PaymentGateway;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true, // Chỉ có sau khi cổng thanh toán xử lý xong và phản hồi về
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
    enum: PaymentTransactionStatus,
    default: PaymentTransactionStatus.INITIATED,
    name: 'payment_status',
  })
  paymentStatus: PaymentTransactionStatus;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true, // Chỉ có sau khi cổng thanh toán phản hồi mã lỗi/thành công
    name: 'response_code',
  })
  responseCode: string | null;

  @Column({
    type: 'jsonb', // Chuyên dụng lưu trữ dữ liệu JSON thô trong PostgreSQL, tối ưu tốc độ đọc/ghi
    nullable: true,
    name: 'gateway_payload',
  })
  gatewayPayload: Record<string, any> | null; // Kiểu đối tượng JSON linh hoạt trong TypeScript

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'created_at',
  })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    nullable: true, // Chỉ cập nhật khi trạng thái chuyển sang SUCCESS
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

  // Cấu hình mối quan hệ (Relations)
  @ManyToOne(() => Order, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'order_id' })
  order: Order;
}
