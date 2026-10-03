export interface GenreMovieRow {
  id: string;
  title: string;
  durationMinutes: number;
  releaseDate: Date | string | null;
  ageRating: string;
  status: string;
  posterUrl: string | null;
}

export interface GenreMovieCriteria {
  /** Trạng thái phim; undefined → mọi trạng thái. */
  status?: string;
  page: number;
  limit: number;
}

/**
 * Cổng đọc dữ liệu phim theo thể loại (dữ liệu của module `movies`, bảng nối `movie_genres`).
 * Genres KHÔNG được import entity Movie hay chạm `movies` / `movie_genres` ngoài adapter của port này.
 */
export interface IMovieCatalogGateway {
  /** Số phim đang gắn thể loại này (mọi trạng thái). */
  countByGenre(genreId: string): Promise<number>;

  /** Sắp xếp theo ngày phát hành giảm dần. */
  findByGenre(
    genreId: string,
    criteria: GenreMovieCriteria,
  ): Promise<{ items: GenreMovieRow[]; total: number }>;
}

export const MOVIE_CATALOG_GATEWAY = Symbol('MOVIE_CATALOG_GATEWAY');
