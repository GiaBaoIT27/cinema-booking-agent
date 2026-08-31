import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { ProvinceType } from '../enums/province-type.enum.js';
import { Ward } from './ward.entity.js';

@Entity('provinces')
export class Province {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;

  @Column({ type: 'enum', enum: ProvinceType })
  type: ProvinceType;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @OneToMany(() => Ward, (ward) => ward.province)
  wards: Relation<Ward[]>;
}
