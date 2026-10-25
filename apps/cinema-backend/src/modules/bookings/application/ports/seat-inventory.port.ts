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

  /** Upsert HOLDING cho các ghế. */
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

  /** BOOKED, hoặc HOLDING (của `userId` nếu có) -> AVAILABLE. */
  releaseForOrder(
    showtimeId: string,
    seatIds: string[],
    userId?: string,
  ): Promise<void>;

  /** Mọi HOLDING quá hạn -> AVAILABLE. */
  releaseExpiredHolds(now: Date): Promise<void>;

  /** Mọi HOLDING của các suất chiếu -> AVAILABLE (khi suất chiếu bị hủy). */
  releaseHoldsForShowtimes(showtimeIds: string[]): Promise<void>;
}

export const SEAT_INVENTORY = Symbol('SEAT_INVENTORY');
