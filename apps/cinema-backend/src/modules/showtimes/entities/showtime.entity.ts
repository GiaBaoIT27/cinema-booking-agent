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
import { Auditorium } from '#modules/cinemas/entities/auditorium.entity.js';
import { Movie } from '#modules/movies/entities/movie.entity.js';
import { ShowtimeSeat } from './showtime-seat.entity.js';
import { PriceRule } from './price-rules.entity.js';
import { ProjectionType } from '../enums/projection-type.enum.js';
import { ShowtimeStatus } from '../enums/showtime-status.enum.js';

@Entity('showtimes')
@Check(`"end_time" > "start_time"`)
@Check(`"cleaning_minutes" >= 0`)
@Index('idx_showtimes_auditorium_schedule_exclusion', { synchronize: false })
export class Showtime {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id: string;

  @Index('idx_showtimes_auditorium_id')
  @Column({
    type: 'bigint',
    nullable: false,
    name: 'auditorium_id',
  })
  auditoriumId: string;

  @Index('idx_showtimes_movie_id')
  @Column({
    type: 'bigint',
    nullable: false,
    name: 'movie_id',
  })
  movieId: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    enum: ProjectionType,
    default: ProjectionType.TWO_D,
    name: 'projection_type',
  })
  projectionType: ProjectionType;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    name: 'audio_language',
  })
  audioLanguage: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    name: 'subtitle_language',
  })
  subtitleLanguage: string | null;

  @Column({
    type: 'timestamp',
    nullable: false,
    name: 'start_time',
  })
  startTime: Date;

  @Column({
    type: 'timestamp',
    nullable: false,
    name: 'end_time',
  })
  endTime: Date;

  @Column({
    type: 'integer',
    nullable: false,
    default: 15,
    name: 'cleaning_minutes',
  })
  cleaningMinutes: number;

  @Index('idx_showtimes_status')
  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    enum: ShowtimeStatus,
    default: ShowtimeStatus.SCHEDULED,
    name: 'status',
  })
  status: ShowtimeStatus;

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

  // Mối quan hệ Khóa ngoại
  @ManyToOne(() => Auditorium, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'auditorium_id' })
  auditorium: Relation<Auditorium>;

  @ManyToOne(() => Movie, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'movie_id' })
  movie: Relation<Movie>;

  @OneToMany(() => ShowtimeSeat, (showtimeSeat) => showtimeSeat.showtime)
  showtimeSeats: Relation<ShowtimeSeat>[];
}
