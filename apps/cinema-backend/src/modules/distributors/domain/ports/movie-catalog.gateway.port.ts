export interface DistributorMovieRow {
  id: string;
  title: string;
  originalTitle: string | null;
  durationMinutes: number;
  releaseDate: Date | string | null;
  ageRating: string;
  status: string;
}

export interface DistributorMovieCriteria {
  /** Trạng thái phim (UPCOMING | SHOWING | ENDED); undefined → mọi trạng thái. */
  status?: string;
  page: number;
  limit: number;
}

/**
 * Cổng đọc dữ liệu phim thuộc một nhà phát hành (dữ liệu của module `movies`).
 * Distributors KHÔNG được import entity Movie hay chạm bảng `movies` ngoài adapter của port này.
 */
export interface IMovieCatalogGateway {
  countByDistributor(distributorId: string): Promise<number>;

  /** Sắp xếp theo ngày phát hành giảm dần. */
  findByDistributor(
    distributorId: string,
    criteria: DistributorMovieCriteria,
  ): Promise<{ items: DistributorMovieRow[]; total: number }>;
}

export const MOVIE_CATALOG_GATEWAY = Symbol('MOVIE_CATALOG_GATEWAY');
