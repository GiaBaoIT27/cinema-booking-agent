import { Entity, Column, Index } from 'typeorm';
import { BaseIdentityEntity } from '#src/common/domain/base-identity.entity.js';
import { DistributorStatus } from '../enums/distributor-status.enum.js';

@Entity('distributors')
@Index(['name'], { unique: true })
@Index(['taxCode'], { unique: true })
@Index(['status'])
export class Distributor extends BaseIdentityEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;

  @Column({ name: 'tax_code', type: 'varchar', length: 50, unique: true })
  taxCode: string;

  @Column({ type: 'varchar', length: 500 })
  address: string;

  @Column({ name: 'contact_person', type: 'varchar', length: 255 })
  contactPerson: string;

  @Column({ name: 'contact_email', type: 'varchar', length: 100 })
  contactEmail: string;

  @Column({ name: 'contact_phone', type: 'varchar', length: 20 })
  contactPhone: string;

  @Column({
    name: 'bank_account_number',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  bankAccountNumber: string | null;

  @Column({ name: 'bank_name', type: 'varchar', length: 100, nullable: true })
  bankName: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: DistributorStatus.ACTIVE,
  })
  status: DistributorStatus;
}
