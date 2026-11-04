export interface SeatHoldRecord {
  showtimeId: string;
  seatId: string;
  userId: string | null;
  holdExpiresAt: Date | null;
}

/**
 * Kho trạng thái giữ/bán ghế theo suất chiếu (bảng showtime_seats) –
 * dữ liệu thuộc module `showtimes`; bookings chỉ điều phối qua cổng này.
 */
export interface ISeatInventory {
  /** Trong danh sách ghế truyền vào, những ghế đã BOOKED. */
  findBookedSeatIds(showtimeId: string, seatIds: string[]): Promise<string[]>;

  /** Ghế đang HOLDING còn hạn của đúng `userId`. */
  findActiveHolds(
    showtimeId: string,
    seatIds: string[],
    userId: string,
    now: Date,
  ): Promise<SeatHoldRecord[]>;

  /** Mọi ghế HOLDING còn hạn của user (mọi suất chiếu), mới nhất trước. */
  findActiveHoldsByUser(userId: string, now: Date): Promise<SeatHoldRecord[]>;

  /** Ghế HOLDING đã quá hạn. */
  findExpiredHolds(now: Date): Promise<SeatHoldRecord[]>;

  /**
   * Giữ ghế nguyên tử ở DB (all-or-nothing) – nguồn sự thật cuối cùng, kể cả khi Redis
   * mất khóa. false => có ghế đang được người khác giữ / đã gắn đơn / đã bán.
   */
  tryHold(
    showtimeId: string,
    seatIds: string[],
    userId: string,
    expiresAt: Date,
    now: Date,
  ): Promise<boolean>;

  /** Gắn ghế HOLDING (chưa gắn đơn) của user vào đơn + gia hạn giữ (all-or-nothing). */
  claimForOrder(
    showtimeId: string,
    seatIds: string[],
    userId: string,
    orderCode: string,
    holdUntil: Date,
    now: Date,
  ): Promise<boolean>;

  /** Gỡ gắn đơn (ghế vẫn HOLDING). */
  unclaimForOrder(
    showtimeId: string,
    seatIds: string[],
    orderCode: string,
  ): Promise<void>;

  /** HOLDING (chưa gắn đơn) của `userId` -> AVAILABLE. Trả về số dòng ảnh hưởng. */
  releaseHolds(
    showtimeId: string,
    seatIds: string[],
    userId: string,
  ): Promise<number>;

  /** HOLDING của đơn `orderCode` -> BOOKED (all-or-nothing). */
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

  /** BOOKED của đơn `orderCode` -> HOLDING. */
  revertBooked(
    showtimeId: string,
    seatIds: string[],
    orderCode: string,
  ): Promise<void>;

  /** HOLDING của đơn `orderCode` (hoặc HOLDING chưa gắn đơn của `userId`) -> AVAILABLE. */
  releaseForOrder(
    showtimeId: string,
    seatIds: string[],
    orderCode: string,
    userId?: string,
  ): Promise<void>;

  /** Mọi HOLDING quá hạn -> AVAILABLE. */
  releaseExpiredHolds(now: Date): Promise<void>;

  /** Mọi HOLDING của các suất chiếu -> AVAILABLE (khi suất chiếu bị hủy). */
  releaseHoldsForShowtimes(showtimeIds: string[]): Promise<void>;
}

export const SEAT_INVENTORY = Symbol('SEAT_INVENTORY');
