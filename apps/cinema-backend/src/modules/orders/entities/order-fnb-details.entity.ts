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
import { FnbItem } from '#modules/fnb/entities/fnb-item.entities.js'; // Giả định thực thể fnb_items nằm trong module foods của bạn
import { User } from '#modules/users/entities/user.entity.js'; // Giả định thực thể User nằm ở đây
import { FnbDetailStatus } from '../enums/fnb-detail-status.enum.js';
import { ColumnNumericTransformer } from '#src/common/transformers/numeric.transformer.js';

@Entity('order_fnb_details')
// Ràng buộc số lượng sản phẩm mua phải lớn hơn 0
@Check(`"quantity" > 0`)
// Ràng buộc đơn giá snapshot và thành tiền không được âm
@Check(`"unit_price" >= 0.00`)
@Check(`"subtotal" >= 0.00`)
export class OrderFnbDetail {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id: string;

  @Index('idx_order_fnb_details_order_id')
  @Column({
    type: 'bigint',
    nullable: false,
    name: 'order_id',
  })
  orderId: string;

  @Index('idx_order_fnb_details_fnb_item_id')
  @Column({
    type: 'bigint',
    nullable: false,
    name: 'fnb_item_id',
  })
  fnbItemId: string;

  @Column({
    type: 'integer',
    nullable: false,
    name: 'quantity',
  })
  quantity: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: false,
    name: 'unit_price',
    transformer: new ColumnNumericTransformer(),
  })
  unitPrice: number; // Trả về dạng string để đảm bảo độ chính xác của số thập phân (NUMERIC)

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: false,
    name: 'subtotal',
    transformer: new ColumnNumericTransformer(),
  })
  subtotal: number;

  @Index('idx_order_fnb_details_status')
  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    enum: FnbDetailStatus,
    default: FnbDetailStatus.PENDING,
    name: 'status',
  })
  status: FnbDetailStatus;

  @Column({
    type: 'timestamp',
    nullable: true, // NULLABLE cho đến khi khách nhận bắp nước tại quầy
    name: 'fulfilled_at',
  })
  fulfilledAt: Date | null;

  @Index('idx_order_fnb_details_fulfilled_by')
  @Column({
    type: 'bigint',
    nullable: true, // NULLABLE cho đến khi nhân viên quầy ấn xác nhận xuất hàng
    name: 'fulfilled_by',
  })
  fulfilledBy: string | null;

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

  @ManyToOne(() => FnbItem, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'fnb_item_id' })
  fnbItem: Relation<FnbItem>;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'fulfilled_by' })
  fulfilledByUser: Relation<User | null>;
}
