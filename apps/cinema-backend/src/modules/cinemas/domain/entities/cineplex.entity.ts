import { Entity, Column, Index, Check, ManyToOne, JoinColumn } from 'typeorm';
import { BaseIdentityEntity } from '#src/common/domain/base-identity.entity.js';
import { CineplexStatus } from '../enums/cineplex-status.enum.js';

type ExternalEntity = Record<string, any>;

@Entity('cineplexes')
@Check(`"latitude" IS NULL OR ("latitude" >= -90.0 AND "latitude" <= 90.0)`)
@Check(
  `"longitude" IS NULL OR ("longitude" >= -180.0 AND "longitude" <= 180.0)`,
)
@Check(`"status" IN ('ACTIVE', 'MAINTENANCE', 'CLOSED')`)
export class Cineplex extends BaseIdentityEntity {
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

  // bigint => driver trả về string
  @Index('idx_cineplexes_province_id')
  @Column({
    type: 'bigint',
    nullable: false,
    name: 'province_id',
  })
  provinceId: string;

  @Index('idx_cineplexes_ward_id')
  @Column({
    type: 'bigint',
    nullable: false,
    name: 'ward_id',
  })
  wardId: string;

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

  // Quan hệ xuyên module (locations): chỉ khai báo bằng chuỗi để giữ khóa ngoại ở DB
  // và bảo vệ ranh giới module. KHÔNG dùng để truy vấn – lấy địa giới qua LocationsFacade.
  @ManyToOne('Province', { nullable: true })
  @JoinColumn({ name: 'province_id' })
  province: ExternalEntity | null;

  @ManyToOne('Ward', { nullable: true })
  @JoinColumn({ name: 'ward_id' })
  ward: ExternalEntity | null;
}
