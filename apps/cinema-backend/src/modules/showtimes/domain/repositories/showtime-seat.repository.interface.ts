import { ShowtimeSeat } from '../entities/showtime-seat.entity.js';

export interface IShowtimeSeatRepository {
  findByShowtimeId(showtimeId: string): Promise<ShowtimeSeat[]>;

  /** Trong danh sách ghế truyền vào, những ghế đã BOOKED. */
  findBookedSeatIds(showtimeId: string, seatIds: string[]): Promise<string[]>;

  /** Ghế đang HOLDING còn hạn của đúng `userId` và CHƯA gắn với đơn hàng nào. */
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

  /**
   * Giữ ghế nguyên tử (all-or-nothing) ở tầng DB. Chỉ giữ được ghế đang AVAILABLE,
   * hoặc HOLDING đã hết hạn / của chính `userId` mà chưa gắn đơn.
   * @returns false nếu có ghế không giữ được (không ghế nào bị thay đổi).
   */
  tryHold(
    showtimeId: string,
    seatIds: string[],
    userId: string,
    expiresAt: Date,
    now: Date,
  ): Promise<boolean>;

  /**
   * Gắn các ghế HOLDING còn hạn, chưa gắn đơn, của `userId` vào đơn `orderCode`
   * và gia hạn giữ tới `holdUntil` (all-or-nothing).
   */
  claimForOrder(
    showtimeId: string,
    seatIds: string[],
    userId: string,
    orderCode: string,
    holdUntil: Date,
    now: Date,
  ): Promise<boolean>;

  /** Gỡ gắn đơn (ghế vẫn HOLDING) – bù trừ khi tạo đơn thất bại. */
  unclaimForOrder(
    showtimeId: string,
    seatIds: string[],
    orderCode: string,
  ): Promise<void>;

  /** HOLDING của `userId` (chưa gắn đơn) -> AVAILABLE. Trả về số dòng ảnh hưởng. */
  releaseHolds(
    showtimeId: string,
    seatIds: string[],
    userId: string,
  ): Promise<number>;

  /** HOLDING đã gắn đơn `orderCode` -> BOOKED (all-or-nothing). */
  markBooked(
    showtimeId: string,
    seatIds: string[],
    orderCode: string,
  ): Promise<boolean>;

  /** Toàn bộ ghế đã BOOKED cho đúng đơn `orderCode`? */
  isBookedForOrder(
    showtimeId: string,
    seatIds: string[],
    orderCode: string,
  ): Promise<boolean>;

  /** BOOKED của đơn `orderCode` -> HOLDING (bù trừ khi ghi đơn thất bại). */
  revertBooked(
    showtimeId: string,
    seatIds: string[],
    orderCode: string,
  ): Promise<void>;

  /**
   * HOLDING của đơn `orderCode` -> AVAILABLE khi hủy/hết hạn đơn.
   * Tương thích dữ liệu cũ: HOLDING chưa gắn đơn của `userId` cũng được nhả.
   * KHÔNG bao giờ nhả ghế BOOKED.
   */
  releaseForOrder(
    showtimeId: string,
    seatIds: string[],
    orderCode: string,
    userId?: string,
  ): Promise<void>;

  /** Mọi HOLDING quá hạn -> AVAILABLE. */
  releaseExpiredHolds(now: Date): Promise<void>;

  /** Mọi HOLDING của các suất chiếu -> AVAILABLE. Trả về số dòng ảnh hưởng. */
  releaseHoldsByShowtimes(showtimeIds: string[]): Promise<number>;
}

export const SHOWTIME_SEAT_REPOSITORY = Symbol('SHOWTIME_SEAT_REPOSITORY');
