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
import type { Relation } from 'typeorm';
import { Order } from './order.entity.js';
import { ColumnNumericTransformer } from '#src/common/transformers/numeric.transformer.js';

@Entity('order_seat_details')
@Check(`"price" >= 0.00`)
export class OrderSeatDetail {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id: string;

  @Index('idx_order_seat_details_order_id')
  @Column({
    type: 'bigint',
    nullable: false,
    name: 'order_id',
  })
  orderId: string;

  @Index('idx_order_seat_details_showtime_id')
  @Column({
    type: 'bigint',
    nullable: false,
    name: 'showtime_id',
  })
  showtimeId: string;

  @Index('idx_order_seat_details_seat_id')
  @Column({
    type: 'bigint',
    nullable: false,
    name: 'seat_id',
  })
  seatId: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: false,
    name: 'price',
    transformer: new ColumnNumericTransformer(),
  })
  price: number;

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

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Relation<Order>;

  // Quan hệ xuyên module: chỉ khai báo bằng chuỗi để giữ khóa ngoại ở DB và bảo vệ ranh giới module.
  // KHÔNG dùng để truy vấn – lấy dữ liệu qua facade của module tương ứng.
  @ManyToOne('Showtime', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'showtime_id' })
  showtime: unknown;

  @ManyToOne('Seat', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'seat_id' })
  seat: unknown;
}
