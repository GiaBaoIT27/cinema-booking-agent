import {
  Entity,
  PrimaryColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Genre } from './genre.entity.js';

@Entity('movie_genres')
export class MovieGenre {
  @PrimaryColumn({
    type: 'bigint',
    name: 'movie_id',
  })
  movieId: string;

  @PrimaryColumn({
    type: 'bigint',
    name: 'genre_id',
  })
  genreId: string;

  @ManyToOne(() => Genre, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'genre_id' })
  genre: Genre;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'created_at',
  })
  createdAt: Date;
}
