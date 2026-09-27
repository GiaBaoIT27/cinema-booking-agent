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
import { Seat } from '#modules/cinemas/entities/seat.entity.js';
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

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => Showtime, (showtime) => showtime.showtimeSeats)
  @JoinColumn({ name: 'showtime_id' })
  showtime: Relation<Showtime>;

  @ManyToOne(() => Seat, (seat) => seat.showtimeSeats, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'seat_id' })
  seat: Relation<Seat>;
}
