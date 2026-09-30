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
import { Auditorium } from './auditorium.entity.js';
import { SeatType } from '#modules/seat-types/entities/seat-type.entity.js';
import { ShowtimeSeat } from '#modules/showtimes/domain/entities/showtime-seat.entity.js';
import { SeatStatus } from '../enums/seat-status.enum.js';

@Entity('seats')
@Check(`length("row_label") > 0`)
@Check(`"column_number" > 0`)
@Check(`length("seat_number") > 0`)
@Check(`"coord_x" >= 0`)
@Check(`"coord_y" >= 0`)
@Check(`"grid_span" >= 1`)
@Check(`"status" IN ('ACTIVE', 'MAINTENANCE', 'DISABLED')`)
export class Seat {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id: string;

  @Index('idx_seats_auditorium_id')
  @Column({
    type: 'bigint',
    nullable: false,
    name: 'auditorium_id',
  })
  auditoriumId: string;

  @Index('idx_seats_seat_type_id')
  @Column({
    type: 'bigint',
    nullable: false,
    name: 'seat_type_id',
  })
  seatTypeId: string;

  @Column({
    type: 'varchar',
    length: 5,
    nullable: false,
    name: 'row_label',
  })
  rowLabel: string;

  @Column({
    type: 'integer',
    nullable: false,
    name: 'column_number',
  })
  columnNumber: number;

  @Column({
    type: 'varchar',
    length: 10,
    nullable: false,
    name: 'seat_number',
  })
  seatNumber: string;

  @Column({
    type: 'integer',
    nullable: false,
    name: 'coord_x',
  })
  coordX: number;

  @Column({
    type: 'integer',
    nullable: false,
    name: 'coord_y',
  })
  coordY: number;

  @Column({
    type: 'integer',
    nullable: false,
    default: 1,
    name: 'grid_span',
  })
  gridSpan: number;

  @Index('idx_seats_status')
  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    default: SeatStatus.ACTIVE,
    name: 'status',
  })
  status: SeatStatus;

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

  // Thiết lập các mối quan hệ (Relations)
  @ManyToOne(() => Auditorium, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auditorium_id' })
  auditorium: Relation<Auditorium>;

  @ManyToOne(() => SeatType, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'seat_type_id' })
  seatType: Relation<SeatType>;

  @OneToMany(() => ShowtimeSeat, (showtimeSeat) => showtimeSeat.seat)
  showtimeSeats: Relation<ShowtimeSeat>[];
}
