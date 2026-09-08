import {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { WardType } from '../enums/ward-type.enum.js';
import { Province } from './province.entity.js';

@Entity('wards')
@Index(['code'], { unique: true })
@Index(['provinceId'])
export class Ward {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: string;

  @Column({
    name: 'province_id',
    type: 'bigint',
    comment: 'ID của tỉnh/thành phố trực thuộc',
  })
  provinceId: string;

  @ManyToOne(() => Province, (province) => province.wards, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'province_id' })
  province: any;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'code',
    comment: 'Mã định danh phường/xã/thị trấn (Hành chính)',
  })
  code: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'name',
    comment: 'Tên đầy đủ của phường/xã/thị trấn',
  })
  name: string;

  @Column({
    type: 'enum',
    enum: WardType,
    name: 'type',
    comment: 'Loại hình đơn vị hành chính cấp xã (Phường, Xã, Thị trấn)',
  })
  type: WardType;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
    comment: 'Thời điểm tạo bản ghi',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Thời điểm cập nhật bản ghi gần nhất',
  })
  updatedAt: Date;
}
