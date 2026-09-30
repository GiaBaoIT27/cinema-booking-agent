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
  OneToMany,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Showtime } from '#modules/showtimes/domain/entities/showtime.entity.js'; // Thay đổi đường dẫn thực tế của bạn
import { User } from '#modules/users/entities/user.entity.js'; // Giả định thực thể User nằm ở đây
import { Ticket } from './ticket.entity.js';
import { OrderFnbDetail } from './order-fnb-details.entity.js';
import { OrderSeatDetail } from './order-seat-details.entity.js';
import { OrderChannel } from '../enums/order-channel.enum.js';
import { OrderStatus } from '../enums/order-status.enum.js';
import { PaymentMethod } from '../enums/payment-method.enum.js';
import { ColumnNumericTransformer } from '#src/common/transformers/numeric.transformer.js';

@Entity('orders')
// Ràng buộc kiểm tra các loại số tiền không được âm
@Check(`"subtotal_tickets" >= 0.00`)
@Check(`"subtotal_fnb" >= 0.00`)
@Check(`"discount_amount" >= 0.00`)
@Check(`"final_amount" >= 0.00`)
export class Order {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id: string;

  @Index('idx_orders_order_code_unique', { unique: true })
  @Column({
    type: 'varchar',
    length: 64,
    unique: true,
    nullable: false,
    name: 'order_code',
  })
  orderCode: string;

  @Index('idx_orders_user_id')
  @Column({
    type: 'bigint',
    nullable: false,
    name: 'user_id',
  })
  userId: string;

  @Index('idx_orders_staff_id')
  @Column({
    type: 'bigint',
    nullable: true, // NULLABLE nếu đặt qua App/Web không có nhân viên can thiệp
    name: 'staff_id',
  })
  staffId: string | null;

  @Index('idx_orders_showtime_id')
  @Column({
    type: 'bigint',
    nullable: false,
    name: 'showtime_id',
  })
  showtimeId: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    enum: OrderChannel,
    default: OrderChannel.ONLINE_APP,
    name: 'channel',
  })
  channel: OrderChannel;

  @Column({
    type: 'numeric', // NUMERIC(12,2) tương đương kiểu decimal trong database
    precision: 12,
    scale: 2,
    nullable: false,
    name: 'subtotal_tickets',
    transformer: new ColumnNumericTransformer(),
  })
  subtotalTickets: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: false,
    default: 0.0,
    name: 'subtotal_fnb',
    transformer: new ColumnNumericTransformer(),
  })
  subtotalFnb: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: false,
    default: 0.0,
    name: 'discount_amount',
    transformer: new ColumnNumericTransformer(),
  })
  discountAmount: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: false,
    default: 0.0,
    name: 'final_amount',
    transformer: new ColumnNumericTransformer(),
  })
  finalAmount: number;

  @Column({
    type: 'varchar',
    length: 30,
    nullable: true, // Thường để trống lúc tạo đơn PENDING, cập nhật khi khách chọn cổng
    enum: PaymentMethod,
    name: 'payment_method',
  })
  paymentMethod: PaymentMethod | null;

  @Index('idx_orders_status')
  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    enum: OrderStatus,
    default: OrderStatus.PENDING,
    name: 'status',
  })
  status: OrderStatus;

  @Index('idx_orders_qr_code_token_unique', { unique: true })
  @Column({
    type: 'varchar',
    length: 500,
    unique: true,
    nullable: true, // Sinh ra sau khi trạng thái đơn hàng chuyển sang PAID
    name: 'qr_code_token',
  })
  qrCodeToken: string | null;

  @Column({
    type: 'timestamp',
    nullable: false,
    name: 'expires_at',
  })
  expiresAt: Date;

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

  // Cấu hình các mối quan hệ (Relations)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'staff_id' })
  staff: Relation<User | null>;

  @ManyToOne(() => Showtime, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'showtime_id' })
  showtime: Relation<Showtime>;

  // Quan hệ ngược: vé thuộc đơn hàng (chỉ dùng để query relations, không tạo cột)
  @OneToMany(() => Ticket, (ticket) => ticket.order)
  tickets: Relation<Ticket[]>;

  @OneToMany(() => OrderSeatDetail, (seatDetail) => seatDetail.order)
  seatDetails: Relation<OrderSeatDetail[]>;

  // Quan hệ ngược: chi tiết F&B thuộc đơn hàng (chỉ dùng để query relations, không tạo cột)
  @OneToMany(() => OrderFnbDetail, (fnbDetail) => fnbDetail.order)
  fnbDetails: Relation<OrderFnbDetail[]>;
}
