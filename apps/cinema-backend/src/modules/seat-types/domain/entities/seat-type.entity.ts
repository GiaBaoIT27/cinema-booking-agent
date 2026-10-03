import { Entity, Column, Index, Check } from 'typeorm';
import { BaseIdentityEntity } from '#src/common/domain/base-identity.entity.js';
import { ColumnNumericTransformer } from '#src/common/transformers/numeric.transformer.js';

@Entity('seat_types')
@Check(`"price_multiplier" >= 1.00`)
@Check(`"surcharge_amount" >= 0.00`)
@Check(`"seat_count" >= 1`)
@Check(`"color_code" ~* '^#[0-9A-Fa-f]{6}$'`)
export class SeatType extends BaseIdentityEntity {
  @Index('idx_seat_types_code_unique', { unique: true })
  @Column({
    type: 'varchar',
    length: 20,
    unique: true,
    nullable: false,
    name: 'code',
  })
  code: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    name: 'name',
  })
  name: string;

  @Column({
    type: 'numeric',
    precision: 3,
    scale: 2,
    nullable: false,
    default: 1.0,
    name: 'price_multiplier',
    transformer: new ColumnNumericTransformer(),
  })
  priceMultiplier: number;

  @Column({
    type: 'numeric',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0.0,
    name: 'surcharge_amount',
    transformer: new ColumnNumericTransformer(),
  })
  surchargeAmount: number;

  @Column({
    type: 'varchar',
    length: 10,
    nullable: false,
    name: 'color_code',
  })
  colorCode: string;

  @Column({
    type: 'integer',
    nullable: false,
    default: 1,
    name: 'seat_count',
  })
  seatCount: number;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'description',
  })
  description: string | null;

  @Column({
    type: 'integer',
    nullable: false,
    default: 1,
    name: 'display_order',
  })
  displayOrder: number;
}
