import {
  Check,
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Distributor } from '#modules/distributors/entities/distributor.entity.js';
import { MovieAgeRating } from '../enums/movie-age-rating.enum.js';
import { MovieStatus } from '../enums/movie-status.enum.js';
import { Genre } from '#modules/genres/entities/genre.entity.js';

@Entity('movies')
@Check(`"duration_minutes" > 0`)
@Check(`"revenue_share_ratio" >= 0 AND "revenue_share_ratio" <= 100`)
export class Movie {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'distributor_id', type: 'bigint' })
  distributorId: string;

  @ManyToOne(() => Distributor, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'distributor_id' })
  distributor: Distributor;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({
    name: 'original_title',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  originalTitle?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  director?: string;

  @Column({ type: 'text', nullable: true })
  cast?: string;

  @Column({ name: 'duration_minutes', type: 'int' })
  durationMinutes: number;

  @Column({ type: 'enum', enum: MovieAgeRating, name: 'age_rating' })
  ageRating: MovieAgeRating;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country?: string;

  @Column({
    name: 'original_language',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  originalLanguage?: string;

  @Column({
    name: 'revenue_share_ratio',
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  revenueShareRatio: number;

  @Column({ name: 'trailer_url', type: 'varchar', length: 500, nullable: true })
  trailerUrl?: string;

  @Column({ name: 'poster_url', type: 'varchar', length: 500, nullable: true })
  posterUrl?: string;

  @Column({ name: 'banner_url', type: 'varchar', length: 500, nullable: true })
  bannerUrl?: string;

  @Column({ name: 'release_date', type: 'date' })
  releaseDate: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate: Date;

  @Column({
    type: 'enum',
    enum: MovieStatus,
    default: MovieStatus.UPCOMING,
  })
  status: MovieStatus;

  // Bảng trung gian movie_genres được TypeORM tự động ánh xạ
  @ManyToMany(() => Genre, { cascade: true })
  @JoinTable({
    name: 'movie_genres',
    joinColumn: { name: 'movie_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'genre_id', referencedColumnName: 'id' },
  })
  genres: Genre[];
}
