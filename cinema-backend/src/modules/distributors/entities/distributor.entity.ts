import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DistributorStatus } from '../enums/distributor-status.enum.js';

@Entity('distributors')
export class Distributor {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'tax_code', type: 'varchar', length: 50, unique: true })
  taxCode: string;

  @Column({ type: 'varchar', length: 500 })
  address: string;

  @Column({ name: 'contact_person', type: 'varchar', length: 255 })
  contactPerson: string;

  @Column({ name: 'contact_email', type: 'varchar', length: 100, unique: true })
  contactEmail: string;

  @Column({ name: 'contact_phone', type: 'varchar', length: 20, unique: true })
  contactPhone: string;

  @Column({
    name: 'bank_account_number',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  bankAccountNumber?: string;

  @Column({ name: 'bank_name', type: 'varchar', length: 100, nullable: true })
  bankName?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: DistributorStatus.ACTIVE,
  })
  status: DistributorStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
