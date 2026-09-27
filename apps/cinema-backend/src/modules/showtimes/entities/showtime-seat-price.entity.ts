import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Check,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Showtime } from '#modules/showtimes/entities/showtime.entity.js';
import { SeatType } from '#modules/seat-types/entities/seat-type.entity.js';
import { ColumnNumericTransformer } from '#src/common/transformers/numeric.transformer.js';

@Entity('showtime_seat_prices')
@Check(`"final_price" >= 0`)
@Index('idx_showtime_seat_prices_seat_type_id', ['seatTypeId'])
export class ShowtimeSeatPrice {
  @PrimaryColumn({
    type: 'bigint',
    name: 'showtime_id',
  })
  showtimeId: string;

  @PrimaryColumn({
    type: 'bigint',
    name: 'seat_type_id',
  })
  seatTypeId: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: false,
    name: 'final_price',
    transformer: new ColumnNumericTransformer(),
  })
  finalPrice: number;

  @Column({
    type: 'boolean',
    nullable: false,
    default: false,
    name: 'is_overridden',
  })
  isOverridden: boolean;

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

  // Cấu hình các mối quan hệ (Relations) và hành động xóa (onDelete)
  @ManyToOne(() => Showtime, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'showtime_id' })
  showtime: Relation<Showtime>;

  @ManyToOne(() => SeatType, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'seat_type_id' })
  seatType: Relation<SeatType>;
}
