import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Check,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Cineplex } from '#modules/cinemas/entities/cineplex.entity.js';
import { ProjectionType } from '#src/modules/showtimes/domain/enums/projection-type.enum.js';
import { DayType } from '../enums/day-type.enum.js';
import { ColumnNumericTransformer } from '#src/common/transformers/numeric.transformer.js';

@Entity('price_rules')
@Check(`"base_price" >= 0.00`)
@Check(`"end_time" > "start_time"`)
@Index('idx_price_rules_lookup', ['projectionType', 'dayType', 'startTime'])
export class PriceRule {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id: string;

  @Index('idx_price_rules_cineplex_id')
  @Column({
    type: 'bigint',
    nullable: true, // NULL đại diện cho chính sách áp dụng toàn hệ thống
    name: 'cineplex_id',
  })
  cineplexId: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    enum: ProjectionType,
    default: ProjectionType.TWO_D,
    name: 'projection_type',
  })
  projectionType: ProjectionType;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    enum: DayType,
    default: DayType.WEEKDAY,
    name: 'day_type',
  })
  dayType: DayType;

  @Column({
    type: 'time',
    nullable: false,
    name: 'start_time',
  })
  startTime: string;

  @Column({
    type: 'time',
    nullable: false,
    name: 'end_time',
  })
  endTime: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: false,
    name: 'base_price',
    transformer: new ColumnNumericTransformer(),
  })
  basePrice: number;

  @ManyToOne(() => Cineplex, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cineplex_id' })
  cineplex: Relation<Cineplex> | null;

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
