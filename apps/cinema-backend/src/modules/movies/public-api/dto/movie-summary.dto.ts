import type { AgeRating } from '../../domain/enums/movie-age-rating.enum.js';
import type { MovieStatus } from '../../domain/enums/movie-status.enum.js';

/** Thông tin tóm tắt của phim dành cho module khác (showtimes, bookings, reports...). */
export interface MovieSummaryDto {
  id: number;
  distributorId: number;
  title: string;
  durationMinutes: number;
  ageRating: AgeRating;
  status: MovieStatus;
  /** 'YYYY-MM-DD' */
  releaseDate: string;
  /** 'YYYY-MM-DD' */
  endDate: string;
  posterUrl: string | null;
}
