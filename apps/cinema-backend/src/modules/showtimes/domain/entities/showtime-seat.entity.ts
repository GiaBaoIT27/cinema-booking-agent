import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Showtime } from './showtime.entity.js';
import type { Seat } from '#modules/cinemas/domain/entities/seat.entity.js';
import { ShowtimeSeatStatus } from '../enums/showtime-seat-status.js';

@Entity('showtime_seats')
export class ShowtimeSeat {
  @PrimaryColumn({ name: 'showtime_id', type: 'bigint' })
  showtimeId: string;

  @PrimaryColumn({ name: 'seat_id', type: 'bigint' })
  seatId: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    default: ShowtimeSeatStatus.AVAILABLE,
  })
  status: ShowtimeSeatStatus;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId: string | null;

  @Column({ name: 'hold_expires_at', type: 'timestamp', nullable: true })
  holdExpiresAt: Date | null;

  /**
   * Mã đơn hàng đã "nhận" ghế đang giữ (gắn khi tạo đơn PENDING, giữ nguyên khi BOOKED).
   * Ghế đã gắn đơn thì không thể bị giữ lại / dùng cho đơn khác, và chỉ đúng đơn đó
   * mới chốt (BOOKED) hoặc nhả được ghế.
   */
  @Column({ name: 'order_code', type: 'varchar', length: 64, nullable: true })
  orderCode: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => Showtime, (showtime) => showtime.showtimeSeats)
  @JoinColumn({ name: 'showtime_id' })
  showtime: Relation<Showtime>;

  @ManyToOne('Seat', (seat: any) => seat.showtimeSeats, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'seat_id' })
  seat: Relation<Seat>;
}
