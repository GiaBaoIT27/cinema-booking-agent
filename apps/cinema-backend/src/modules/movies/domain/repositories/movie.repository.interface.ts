import { Movie } from '../entities/movie.entity.js';
import { MovieStatus } from '../enums/movie-status.enum.js';
import type { MovieSortField } from '../services/movie-sort.rules.js';

export interface MovieSearchCriteria {
  /** Khớp một phần theo title / originalTitle, không phân biệt hoa thường (repository tự escape ký tự LIKE). */
  keyword?: string;
  status?: MovieStatus;
  genreId?: string;
  sortField: MovieSortField;
  sortDirection: 'ASC' | 'DESC';
  page: number;
  limit: number;
}

/** Dữ liệu tạo phim (ngày dạng 'YYYY-MM-DD' từ DTO hoặc Date). */
export type NewMovie = Omit<Partial<Movie>, 'releaseDate' | 'endDate'> & {
  releaseDate: string | Date;
  endDate: string | Date;
};

/**
 * Interface repository cho Movie.
 * Chỉ làm việc với bảng `movies` và bảng nối `movie_genres` (do module movies sở hữu);
 * KHÔNG load quan hệ distributor / genre (dữ liệu của module khác).
 */
export interface IMovieRepository {
  search(
    criteria: MovieSearchCriteria,
  ): Promise<{ items: Movie[]; total: number }>;

  findById(id: string): Promise<Movie | null>;

  findByIds(ids: string[]): Promise<Movie[]>;

  exists(id: string): Promise<boolean>;

  /** ID các thể loại đang gắn với phim (đọc từ bảng nối movie_genres). */
  findGenreIds(movieId: string): Promise<string[]>;

  /** Tạo phim + gắn thể loại trong MỘT transaction. */
  createWithGenres(data: NewMovie, genreIds: string[]): Promise<Movie>;

  /** Lưu thay đổi các cột của phim (không đụng tới thể loại). */
  save(movie: Movie): Promise<Movie>;

  /** Thay toàn bộ thể loại của phim trong MỘT transaction (chỉ ghi phần chênh lệch). */
  replaceGenres(movieId: string, genreIds: string[]): Promise<void>;

  deleteById(id: string): Promise<void>;
}

export const MOVIE_REPOSITORY = Symbol('MOVIE_REPOSITORY');
