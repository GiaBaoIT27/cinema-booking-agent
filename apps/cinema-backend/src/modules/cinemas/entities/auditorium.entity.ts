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
  OneToMany,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Cineplex } from './cineplex.entity.js';
import { Seat } from './seat.entity.js';
import { Showtime } from '#modules/showtimes/domain/entities/showtime.entity.js';
import { AuditoriumStatus } from '../enums/auditorium-status.enum.js';
import { ScreenType } from '../enums/screen-type.enum.js';

@Entity('auditoriums')
@Check(`"screen_type" IN ('STANDARD', 'IMAX', '4DX', 'GOLD_CLASS')`)
@Check(`"status" IN ('ACTIVE', 'MAINTENANCE', 'INACTIVE')`)
@Check(`"total_seats" > 0`)
export class Auditorium {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id: string;

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
    default: '7.1_SURROUND',
    name: 'audio_type',
  })
  audioType: string;

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

  @ManyToOne(() => Cineplex, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'cineplex_id' })
  cineplex: Relation<Cineplex>;

  @OneToMany(() => Seat, (seat) => seat.auditorium)
  seats: Seat[];

  @OneToMany(() => Showtime, (showtime) => showtime.auditorium)
  showtimes: Showtime[];
}
