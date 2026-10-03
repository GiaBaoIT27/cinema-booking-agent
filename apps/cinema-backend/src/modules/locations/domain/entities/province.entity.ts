import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseIdentityEntity } from '#src/common/domain/base-identity.entity.js';

import { ProvinceType } from '../enums/province-type.enum.js';
import { Ward } from './ward.entity.js';

@Entity('provinces')
@Index(['code'], { unique: true })
export class Province extends BaseIdentityEntity {
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

  // --- Quan hệ ---
  @OneToMany(() => Ward, (ward) => ward.province)
  wards: Ward[];
}
