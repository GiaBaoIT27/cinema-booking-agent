import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, DeepPartial, In, Repository } from 'typeorm';
import { Movie } from '../../domain/entities/movie.entity.js';
import type {
  IMovieRepository,
  MovieSearchCriteria,
  NewMovie,
} from '../../domain/repositories/movie.repository.interface.js';
import type { MovieSortField } from '../../domain/services/movie-sort.rules.js';

const SORT_COLUMN: Record<MovieSortField, string> = {
  releaseDate: 'm.releaseDate',
  title: 'm.title',
  durationMinutes: 'm.durationMinutes',
};

/** Escape ký tự đặc biệt của LIKE/ILIKE (\, %, _) để tìm đúng chuỗi người dùng nhập. */
const escapeLike = (value: string): string => value.replace(/[\\%_]/g, '\\$&');

@Injectable()
export class TypeOrmMovieRepository implements IMovieRepository {
  constructor(
    @InjectRepository(Movie)
    private readonly repo: Repository<Movie>,
    private readonly dataSource: DataSource,
  ) {}

  async search(
    criteria: MovieSearchCriteria,
  ): Promise<{ items: Movie[]; total: number }> {
    const { keyword, status, genreId, sortField, sortDirection, page, limit } =
      criteria;
    const qb = this.repo.createQueryBuilder('m');

    // Lọc theo thể loại qua bảng nối movie_genres (bảng của movies) — không cần JOIN sang bảng genres.
    if (genreId) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM movie_genres mg WHERE mg.movie_id = m.id AND mg.genre_id = :genreId)',
        { genreId },
      );
    }
    if (keyword) {
      qb.andWhere('(m.title ILIKE :search OR m.originalTitle ILIKE :search)', {
        search: `%${escapeLike(keyword)}%`,
      });
    }
    if (status) qb.andWhere('m.status = :status', { status });

    qb.orderBy(SORT_COLUMN[sortField], sortDirection)
      // Tie-breaker: phân trang ổn định khi nhiều phim trùng giá trị sắp xếp
      .addOrderBy('m.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  findById(id: string): Promise<Movie | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByIds(ids: string[]): Promise<Movie[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.repo.find({ where: { id: In(ids) } });
  }

  exists(id: string): Promise<boolean> {
    return this.repo.exists({ where: { id } });
  }

  async findGenreIds(movieId: string): Promise<string[]> {
    const rows: { genre_id: string | number }[] = await this.dataSource.query(
      'SELECT genre_id FROM movie_genres WHERE movie_id = $1 ORDER BY genre_id',
      [movieId],
    );
    return rows.map((row) => String(row.genre_id));
  }

  createWithGenres(data: NewMovie, genreIds: string[]): Promise<Movie> {
    return this.dataSource.transaction(async (manager) => {
      const movie = await manager.save(
        manager.create(Movie, data as unknown as DeepPartial<Movie>),
      );

      if (genreIds.length > 0) {
        await manager
          .createQueryBuilder()
          .relation(Movie, 'genres')
          .of(movie.id)
          .add(genreIds);
      }
      return movie;
    });
  }

  save(movie: Movie): Promise<Movie> {
    return this.repo.save(movie);
  }

  async replaceGenres(movieId: string, genreIds: string[]): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const rows: { genre_id: string | number }[] = await manager.query(
        'SELECT genre_id FROM movie_genres WHERE movie_id = $1',
        [movieId],
      );
      const current = new Set(rows.map((row) => String(row.genre_id)));
      const target = new Set(genreIds);

      const toAdd = [...target].filter((id) => !current.has(id));
      const toRemove = [...current].filter((id) => !target.has(id));
      if (toAdd.length === 0 && toRemove.length === 0) return;

      await manager
        .createQueryBuilder()
        .relation(Movie, 'genres')
        .of(movieId)
        .addAndRemove(toAdd, toRemove);
    });
  }

  async deleteById(id: string): Promise<void> {
    // movie_genres tự xóa nhờ Foreign Key ON DELETE CASCADE
    await this.repo.delete({ id });
  }
}
