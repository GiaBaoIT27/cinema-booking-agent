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
import { Showtime } from '#modules/showtimes/entities/showtime.entity.js';
import { Seat } from '#modules/cinemas/entities/seat.entity.js';
import { User } from '#modules/users/entities/user.entity.js';
import { TicketStatus } from '../enums/ticket-status.enum.js';
import { ColumnNumericTransformer } from '#src/common/transformers/numeric.transformer.js';

@Entity('tickets')
// Ràng buộc giá vé ghi nhận không được âm
@Check(`"price" >= 0.00`)
export class Ticket {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id: string;

  @Index('idx_tickets_order_id')
  @Column({
    type: 'bigint',
    nullable: false,
    name: 'order_id',
  })
  orderId: string;

  @Index('idx_tickets_showtime_id')
  @Column({
    type: 'bigint',
    nullable: false,
    name: 'showtime_id',
  })
  showtimeId: string;

  @Index('idx_tickets_seat_id')
  @Column({
    type: 'bigint',
    nullable: false,
    name: 'seat_id',
  })
  seatId: string;

  @Index('idx_tickets_ticket_code_unique', { unique: true })
  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
    nullable: false,
    name: 'ticket_code',
  })
  ticketCode: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: false,
    name: 'price',
    transformer: new ColumnNumericTransformer(),
  })
  price: number; // Trả về dạng string trong JS để đảm bảo độ chính xác tài chính

  @Index('idx_tickets_status')
  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    enum: TicketStatus,
    default: TicketStatus.VALID,
    name: 'status',
  })
  status: TicketStatus;

  @Column({
    type: 'timestamp',
    nullable: true, // NULLABLE cho đến khi khách hàng soát vé vào cửa
    name: 'checked_in_at',
  })
  checkedInAt: Date | null;

  @Index('idx_tickets_checked_in_by')
  @Column({
    type: 'bigint',
    nullable: true, // NULLABLE cho đến khi được nhân viên quét mã tại cửa rạp
    name: 'checked_in_by',
  })
  checkedInBy: string | null;

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
  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Relation<Order>;

  @ManyToOne(() => Showtime, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'showtime_id' })
  showtime: Relation<Showtime>;

  @ManyToOne(() => Seat, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'seat_id' })
  seat: Relation<Seat>;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'checked_in_by' })
  ticketChecker: Relation<User | null>;
}
