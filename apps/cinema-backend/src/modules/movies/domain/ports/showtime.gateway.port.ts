/**
 * Cổng đọc DUY NHẤT còn lại của movies sang module `showtimes`: một câu COUNT
 * chặn xóa phim còn suất chiếu. Movies KHÔNG được import ShowtimesModule
 * (vòng phụ thuộc Showtimes → Movies) nên phải giữ read-only SQL tại adapter này.
 *
 * Mọi đọc chi tiết suất chiếu (GET /movies/:id/showtimes) đã chuyển sang
 * ShowtimesModule — xem showtimes/presentation/controllers/movie-showtimes.controller.ts.
 */
export interface IShowtimeGateway {
  /** Số suất chiếu có start_time ≥ hiện tại (mọi trạng thái) — dùng chặn xóa phim. */
  countUpcomingByMovie(movieId: string): Promise<number>;
}

export const SHOWTIME_GATEWAY = Symbol('SHOWTIME_GATEWAY');
