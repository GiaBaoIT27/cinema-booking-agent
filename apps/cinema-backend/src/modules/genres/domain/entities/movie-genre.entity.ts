import {
  Entity,
  PrimaryColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Genre } from './genre.entity.js';

/**
 * LƯU Ý (modular monolith): bảng `movie_genres` là bảng nối của module movies.
 * Module genres KHÔNG dùng entity này (đếm/liệt kê phim đi qua IMovieCatalogGateway).
 * Giữ nguyên ở đây cho tới khi refactor module movies — khi đó quyết định chuyển sang movies
 * hoặc xóa nếu `Movie.genres` đã tự khai báo @JoinTable('movie_genres').
 */
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
