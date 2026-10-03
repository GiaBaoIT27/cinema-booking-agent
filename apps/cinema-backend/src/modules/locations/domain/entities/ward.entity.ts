import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  Index,
  type Relation,
} from 'typeorm';
import { BaseIdentityEntity } from '#src/common/domain/base-identity.entity.js';
import { WardType } from '../enums/ward-type.enum.js';
import { Province } from './province.entity.js';

@Entity('wards')
@Index(['code'], { unique: true })
@Index(['provinceId'])
export class Ward extends BaseIdentityEntity {
  @Column({
    name: 'province_id',
    type: 'bigint',
    comment: 'ID của tỉnh/thành phố trực thuộc',
  })
  provinceId: string;

  // Relation<> tránh lỗi "before initialization" do import vòng Province <-> Ward trong ESM
  @ManyToOne(() => Province, (province) => province.wards, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'province_id' })
  province: Relation<Province>;

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
}
