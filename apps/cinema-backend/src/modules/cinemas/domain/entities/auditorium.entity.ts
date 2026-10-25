import {
  Entity,
  Column,
  Index,
  Check,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseIdentityEntity } from '#src/common/domain/base-identity.entity.js';
import { Cineplex } from './cineplex.entity.js';
import { Seat } from './seat.entity.js';
import { AuditoriumStatus } from '../enums/auditorium-status.enum.js';
import { ScreenType } from '../enums/screen-type.enum.js';
import { AudioType } from '../enums/audio-type.enum.js';

@Entity('auditoriums')
@Check(`"screen_type" IN ('STANDARD', 'IMAX', '4DX', 'GOLD_CLASS')`)
@Check(`"status" IN ('ACTIVE', 'MAINTENANCE', 'INACTIVE')`)
@Check(`"total_seats" > 0`)
export class Auditorium extends BaseIdentityEntity {
  @Index('idx_auditoriums_cineplex_id')
  @Column({
    type: 'bigint',
    nullable: false,
    name: 'cineplex_id',
  })
  cineplexId: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    name: 'code',
  })
  code: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
    name: 'name',
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 30,
    nullable: false,
    default: ScreenType.STANDARD,
    name: 'screen_type',
  })
  screenType: ScreenType;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    default: AudioType.SURROUND_7_1,
    name: 'audio_type',
  })
  audioType: AudioType;

  @Column({
    type: 'integer',
    nullable: false,
    name: 'total_seats',
  })
  totalSeats: number;

  @Index('idx_auditoriums_status')
  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    default: AuditoriumStatus.ACTIVE,
    name: 'status',
  })
  status: AuditoriumStatus;

  @ManyToOne(() => Cineplex, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'cineplex_id' })
  cineplex: Relation<Cineplex>;

  @OneToMany(() => Seat, (seat) => seat.auditorium)
  seats: Seat[];
}
