import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ProvinceType } from '../enums/province-type.enum.js';
import { Ward } from './ward.entity.js';

@Entity('provinces')
@Index(['code'], { unique: true })
export class Province {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id: string;

  @Column({
    type: 'varchar',
    length: 10,
    name: 'code',
    comment: 'Mã định danh tỉnh/thành phố (Hành chính)',
  })
  code: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'name',
    comment: 'Tên đầy đủ của tỉnh/thành phố',
  })
  name: string;

  @Column({
    type: 'enum',
    enum: ProvinceType,
    name: 'type',
    comment: 'Loại hình đơn vị hành chính (Tỉnh, Thành phố TW...)',
  })
  type: ProvinceType;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
    comment: 'Thời điểm tạo bản ghi',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp with time zone',
    comment: 'Thời điểm cập nhật bản ghi gần nhất',
  })
  updatedAt: Date;

  // --- Quan hệ ---
  @OneToMany(() => Ward, (ward) => ward.province)
  wards: Ward[];
}
