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
import { CineplexStatus } from '../enums/cineplex-status.enum.js';
import { Province } from '#modules/locations/entities/province.entity.js'; // Đường dẫn tới entity Province của bạn
import { Ward } from '#modules/locations/entities/ward.entity.js';

@Entity('cineplexes')
@Check(`"latitude" IS NULL OR ("latitude" >= -90.0 AND "latitude" <= 90.0)`)
@Check(
  `"longitude" IS NULL OR ("longitude" >= -180.0 AND "longitude" <= 180.0)`,
)
@Check(`"status" IN ('ACTIVE', 'MAINTENANCE', 'CLOSED')`)
export class Cineplex {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id: string;

  @Index('idx_cineplexes_code_unique', { unique: true })
  @Column({
    type: 'varchar',
    length: 50,
    unique: true,
    nullable: false,
    name: 'code',
  })
  code: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
    name: 'name',
  })
  name: string;

  @Index('idx_cineplexes_province_id')
  @Column({
    type: 'bigint',
    nullable: false,
    name: 'province_id',
  })
  provinceId: number;

  @Index('idx_cineplexes_ward_id')
  @Column({
    type: 'bigint',
    nullable: false,
    name: 'ward_id',
  })
  wardId: number;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: false,
    name: 'address',
  })
  address: string;

  @Column({
    type: 'double precision',
    nullable: true,
    name: 'latitude',
  })
  latitude: number | null;

  @Column({
    type: 'double precision',
    nullable: true,
    name: 'longitude',
  })
  longitude: number | null;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    name: 'phone_number',
  })
  phoneNumber: string | null;

  @Index('idx_cineplexes_status')
  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    default: CineplexStatus.ACTIVE,
    name: 'status',
  })
  status: CineplexStatus;

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

  @ManyToOne(() => Province)
  @JoinColumn({ name: 'province_id' })
  province: Province;

  @ManyToOne(() => Ward)
  @JoinColumn({ name: 'ward_id' })
  ward: Ward;
}
