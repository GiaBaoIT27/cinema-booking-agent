export interface ShowtimeRef {
  id: string;
  auditoriumId: string;
  /** Trạng thái do module showtimes công bố (OPEN, SCHEDULED, CLOSED, CANCELLED). */
  status: string;
}

export interface SeatPriceRef {
  seatTypeId: string;
  finalPrice: number;
}

/** Tra cứu suất chiếu & bảng giá vé – dữ liệu thuộc module `showtimes`. */
export interface IShowtimeLookup {
  findById(showtimeId: string): Promise<ShowtimeRef | null>;

  /** Giá vé theo từng loại ghế của suất chiếu (snapshot). Rỗng nếu chưa sinh bảng giá. */
  getSeatPrices(showtimeId: string): Promise<SeatPriceRef[]>;
}

export const SHOWTIME_LOOKUP = Symbol('SHOWTIME_LOOKUP');
