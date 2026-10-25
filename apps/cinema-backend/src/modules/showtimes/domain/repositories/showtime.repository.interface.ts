import { Showtime } from '../entities/showtime.entity.js';
import { ProjectionType } from '../enums/projection-type.enum.js';
import { ShowtimeStatus } from '../enums/showtime-status.enum.js';

export interface ShowtimeListFilter {
  movieId?: number;
  cineplexId?: number;
  date: string;
  projectionType?: ProjectionType;
  status?: ShowtimeStatus;
  page: number;
  limit: number;
}

export interface PaginatedShowtimes {
  data: Showtime[];
  totalItems: number;
}

/** Tiêu chí lọc suất chiếu còn đặt được của một phim (GET /movies/:id/showtimes). */
export interface BookableShowtimeCriteria {
  cineplexId?: string;
  /** Khoảng thời gian (bao gồm 2 đầu) của ngày cần xem. */
  from: Date;
  to: Date;
  /** Chỉ lấy suất bắt đầu sau thời điểm này. */
  now: Date;
}

export interface IShowtimeRepository {
  findById(id: string): Promise<Showtime | null>;

  /** Lấy nhiều suất chiếu theo danh sách ID (dùng cho facade) */
  findByIds(ids: string[]): Promise<Showtime[]>;

  findByIdWithVenue(id: string): Promise<Showtime | null>;

  findByIdWithAuditoriumSeats(id: string): Promise<Showtime | null>;

  findPaginated(filter: ShowtimeListFilter): Promise<PaginatedShowtimes>;

  findOverlapping(
    auditoriumId: string,
    startTime: Date,
    endTime: Date,
    excludeShowtimeId?: string,
  ): Promise<Showtime | null>;

  /**
   * Suất chiếu (SCHEDULED/OPEN) của cụm rạp trong khoảng thời gian,
   * kèm movie + auditorium + cineplex — GET /cineplexes/:id/showtimes.
   */
  findByCineplexAndRange(
    cineplexId: string,
    from: Date,
    to: Date,
    movieId?: string,
  ): Promise<Showtime[]>;

  /** Suất còn đặt được của phim (kèm auditorium + cineplex) — GET /movies/:id/showtimes. */
  findBookableByMovie(
    movieId: string,
    criteria: BookableShowtimeCriteria,
  ): Promise<Showtime[]>;

  /**
   * Hủy (→ CANCELLED) các suất chưa chiếu của các phòng cho trước.
   * Chỉ đụng tới bảng showtimes; `statuses` là tập trạng thái nguồn được phép hủy
   * (phải thỏa `canTransitionStatus(→ CANCELLED)`).
   * Trả về danh sách id đã bị hủy.
   */
  cancelUpcomingByAuditoriums(
    auditoriumIds: string[],
    statuses: ShowtimeStatus[],
  ): Promise<string[]>;

  save(showtime: Partial<Showtime> | Showtime): Promise<Showtime>;

  exists(id: string): Promise<boolean>;
}

export const SHOWTIME_REPOSITORY = Symbol('SHOWTIME_REPOSITORY');

