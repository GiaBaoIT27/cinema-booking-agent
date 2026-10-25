import { ShowtimeSeat } from '../entities/showtime-seat.entity.js';

export interface IShowtimeSeatRepository {
  findByShowtimeId(showtimeId: string): Promise<ShowtimeSeat[]>;

  /** Trong danh sách ghế truyền vào, những ghế đã BOOKED. */
  findBookedSeatIds(showtimeId: string, seatIds: string[]): Promise<string[]>;

  /** Ghế đang HOLDING còn hạn của đúng `userId`. */
  findActiveHolds(
    showtimeId: string,
    seatIds: string[],
    userId: string,
    now: Date,
  ): Promise<ShowtimeSeat[]>;

  /** Mọi ghế HOLDING còn hạn của user (mọi suất chiếu), mới nhất trước. */
  findActiveHoldsByUser(userId: string, now: Date): Promise<ShowtimeSeat[]>;

  /** Ghế HOLDING đã quá hạn. */
  findExpiredHolds(now: Date): Promise<ShowtimeSeat[]>;

  /** Upsert HOLDING cho các ghế (tạo mới nếu chưa có bản ghi). */
  saveHolds(
    showtimeId: string,
    seatIds: string[],
    userId: string,
    expiresAt: Date,
  ): Promise<void>;

  /** HOLDING của `userId` -> AVAILABLE. Trả về số dòng ảnh hưởng. */
  releaseHolds(
    showtimeId: string,
    seatIds: string[],
    userId: string,
  ): Promise<number>;

  /** HOLDING -> BOOKED. Trả về số dòng ảnh hưởng. */
  markBooked(showtimeId: string, seatIds: string[]): Promise<number>;

  /** BOOKED, hoặc HOLDING (của `userId` nếu có truyền) -> AVAILABLE. */
  releaseForOrder(
    showtimeId: string,
    seatIds: string[],
    userId?: string,
  ): Promise<void>;

  /** Mọi HOLDING quá hạn -> AVAILABLE. */
  releaseExpiredHolds(now: Date): Promise<void>;

  /** Mọi HOLDING của các suất chiếu -> AVAILABLE. Trả về số dòng ảnh hưởng. */
  releaseHoldsByShowtimes(showtimeIds: string[]): Promise<number>;
}

export const SHOWTIME_SEAT_REPOSITORY = Symbol('SHOWTIME_SEAT_REPOSITORY');
