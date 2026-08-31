import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { WardType } from '../enums/ward-type.enum.js';
import { Province } from './province.entity.js';

@Entity('wards')
export class Ward {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'province_id', type: 'bigint' })
  provinceId: string;

  @ManyToOne(() => Province, (province) => province.wards, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'province_id' })
  province: Relation<Province>;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'enum', enum: WardType })
  type: WardType;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
