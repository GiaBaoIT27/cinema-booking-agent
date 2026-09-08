import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { DiscountType } from '../enums/promotion.enum.js';
import { ColumnNumericTransformer } from '../transformers/numeric.transformer.js';

@Entity('promotions')
@Index(['code'], { unique: true })
@Index(['isActive', 'startDate', 'endDate'])
export class PromotionEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ name: 'discount_type', type: 'varchar', length: 20 })
  discountType: DiscountType;

  @Column({
    name: 'discount_value',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  discountValue: number;

  @Column({
    name: 'max_discount_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: new ColumnNumericTransformer(),
  })
  maxDiscountAmount: number | null;

  @Column({
    name: 'min_order_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0.0,
    transformer: new ColumnNumericTransformer(),
  })
  minOrderAmount: number;

  @Column({ name: 'usage_limit', type: 'int', nullable: true })
  usageLimit: number | null;

  @Column({ name: 'used_count', type: 'int', default: 0 })
  usedCount: number;

  @Column({ name: 'start_date', type: 'timestamp' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp' })
  endDate: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
