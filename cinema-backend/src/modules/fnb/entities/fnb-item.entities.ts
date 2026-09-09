import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Check,
} from 'typeorm';
import { FnbItemType } from '../enums/fnb-item-type.enum.js';
import { FnbCategory } from '../enums/fnb-category.enum.js';
import { ColumnNumericTransformer } from '#src/common/transformers/numeric.transformer.js';

@Entity('fnb_items')
@Check(`"base_price" >= 0.00`)
@Check(`length("sku") > 0`)
@Check(`length("name") > 0`)
export class FnbItem {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id: string;

  @Index('idx_fnb_items_sku_unique', { unique: true })
  @Column({
    type: 'varchar',
    length: 50,
    unique: true,
    nullable: false,
    name: 'sku',
  })
  sku: string;

  @Index('idx_fnb_items_name_unique', { unique: true })
  @Column({
    type: 'varchar',
    length: 150,
    unique: true,
    nullable: false,
    name: 'name',
  })
  name: string;

  @Index('idx_fnb_items_type')
  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    default: FnbItemType.SINGLE,
    name: 'type',
  })
  type: FnbItemType;

  @Index('idx_fnb_items_category')
  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    name: 'category',
  })
  category: FnbCategory;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    default: 'PHẦN',
    name: 'unit',
  })
  unit: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: false,
    default: 0.0,
    name: 'base_price',
    transformer: new ColumnNumericTransformer(),
  })
  basePrice: number;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    name: 'image_url',
  })
  imageUrl: string | null;

  @Column({
    type: 'text',
    nullable: true,
    name: 'description',
  })
  description: string | null;

  @Index('idx_fnb_items_is_active')
  @Column({
    type: 'boolean',
    nullable: false,
    default: true,
    name: 'is_active',
  })
  isActive: boolean;

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
