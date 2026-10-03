import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type {
  GenreMovieCriteria,
  GenreMovieRow,
  IMovieCatalogGateway,
} from '../../domain/ports/movie-catalog.gateway.port.js';

/**
 * Adapter đọc dữ liệu module `movies` — nơi DUY NHẤT của genres được chạm vào phim.
 *
 * TODO(movies): khi module movies công bố public-api, thay ruột file này bằng MoviesFacade
 * (hoặc chuyển `GET /genres/:id/movies` sang module movies — xem ghi chú bàn giao để tránh
 * phụ thuộc vòng genres ↔ movies).
 */
@Injectable()
export class SqlMovieCatalogGatewayAdapter implements IMovieCatalogGateway {
  constructor(private readonly dataSource: DataSource) {}

  async countByGenre(genreId: string): Promise<number> {
    const [{ count }] = await this.dataSource.query(
      `SELECT COUNT(*)::int as count FROM movie_genres WHERE genre_id = $1`,
      [genreId],
    );
    return count;
  }

  async findByGenre(
    genreId: string,
    criteria: GenreMovieCriteria,
  ): Promise<{ items: GenreMovieRow[]; total: number }> {
    const { status, page, limit } = criteria;

    // 'Movie' resolve qua metadata TypeORM nên không phải import entity của module khác.
    // INNER JOIN qua quan hệ N-N movies <-> movie_genres <-> genres (khai báo ở Movie.genres).
    const qb = this.dataSource
      .getRepository<GenreMovieRow>('Movie')
      .createQueryBuilder('movie')
      .innerJoin('movie.genres', 'genre', 'genre.id = :genreId', { genreId });

    if (status) qb.andWhere('movie.status = :status', { status });

    const [items, total] = await qb
      .select([
        'movie.id',
        'movie.title',
        'movie.durationMinutes',
        'movie.releaseDate',
        'movie.ageRating',
        'movie.status',
        'movie.posterUrl',
      ])
      .orderBy('movie.releaseDate', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total };
  }
}
