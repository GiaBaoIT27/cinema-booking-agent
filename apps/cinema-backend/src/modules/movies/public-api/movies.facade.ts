import { Inject, Injectable } from '@nestjs/common';
import { Movie } from '../domain/entities/movie.entity.js';
import { MOVIE_REPOSITORY } from '../domain/repositories/movie.repository.interface.js';
import type { IMovieRepository } from '../domain/repositories/movie.repository.interface.js';
import type { MovieSummaryDto } from './dto/movie-summary.dto.js';
import { MovieStatus } from '../domain/enums/movie-status.enum.js';

/**
 * Facade công khai của Movies module — cổng giao tiếp DUY NHẤT với các module khác
 * (showtimes, bookings, reports...). Module khác CHỈ import từ `#modules/movies/public-api`
 * và chỉ nhận DTO tóm tắt, không bao giờ nhận entity nội bộ. Mọi hàm trả null/boolean, không ném HTTP exception.
 */
@Injectable()
export class MoviesFacade {
  constructor(
    @Inject(MOVIE_REPOSITORY)
    private readonly movieRepository: IMovieRepository,
  ) {}

  async getMovieById(
    movieId: string | number,
  ): Promise<MovieSummaryDto | null> {
    const movie = await this.movieRepository.findById(String(movieId));
    return movie ? toSummary(movie) : null;
  }

  /** Lấy hàng loạt (ghép thông tin phim vào suất chiếu / vé mà không cần JOIN xuyên module). */
  async getMoviesByIds(
    movieIds: Array<string | number>,
  ): Promise<MovieSummaryDto[]> {
    const movies = await this.movieRepository.findByIds([
      ...new Set(movieIds.map(String)),
    ]);
    return movies.map(toSummary);
  }

  async assertMovieExists(movieId: string | number): Promise<boolean> {
    return this.movieRepository.exists(String(movieId));
  }

  async isMovieEligibleForShowtime(movieId: string | number): Promise<boolean> {
    const movie = await this.movieRepository.findById(String(movieId));
    return !!movie && movie.status !== MovieStatus.ENDED;
  }
}

/** Cột `date` của Postgres có thể về dạng chuỗi 'YYYY-MM-DD' hoặc Date → luôn trả 'YYYY-MM-DD'. */
const toDateOnly = (value: Date | string): string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)
    ? value.slice(0, 10)
    : new Date(value).toISOString().slice(0, 10);

// Entity → DTO tóm tắt (ranh giới: không để entity nội bộ lọt ra ngoài module)
const toSummary = (movie: Movie): MovieSummaryDto => ({
  id: Number(movie.id),
  distributorId: Number(movie.distributorId),
  title: movie.title,
  durationMinutes: movie.durationMinutes,
  ageRating: movie.ageRating,
  status: movie.status,
  releaseDate: toDateOnly(movie.releaseDate),
  endDate: toDateOnly(movie.endDate),
  posterUrl: movie.posterUrl ?? null,
});
