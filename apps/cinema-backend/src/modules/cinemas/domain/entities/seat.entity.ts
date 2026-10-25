import {
  Entity,
  Column,
  Index,
  Check,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseIdentityEntity } from '#src/common/domain/base-identity.entity.js';
import { Auditorium } from './auditorium.entity.js';
import { SeatStatus } from '../enums/seat-status.enum.js';

type ExternalEntity = Record<string, any>;
@Entity('seats')
@Check(`length("row_label") > 0`)
@Check(`"column_number" > 0`)
@Check(`length("seat_number") > 0`)
@Check(`"coord_x" >= 0`)
@Check(`"coord_y" >= 0`)
@Check(`"grid_span" >= 1`)
@Check(`"status" IN ('ACTIVE', 'MAINTENANCE', 'DISABLED')`)
export class Seat extends BaseIdentityEntity {
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

  @ManyToOne(() => Auditorium, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auditorium_id' })
  auditorium: Relation<Auditorium>;

  // Quan hệ xuyên module (seat-types / showtimes): chỉ khai báo bằng chuỗi để giữ khóa ngoại
  // ở DB. KHÔNG dùng để truy vấn – lấy loại ghế qua SeatTypesFacade (xem ISeatTypeLookup).
  @ManyToOne('SeatType', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'seat_type_id' })
  seatType: ExternalEntity | null;

  @OneToMany('ShowtimeSeat', 'seat')
  showtimeSeats: ExternalEntity[];
}
