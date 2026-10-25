export type WidgetType =
  | "MOVIE_LIST"
  | "SHOWTIME_SELECTOR"
  | "SEAT_MATRIX_SELECTOR"
  | "FNB_SELECTOR"
  | "PAYMENT_SUMMARY"
  | "LOGIN_REQUIRED";

export interface GenerativeUIWidget {
  type: WidgetType;
  title: string;
  payload: Record<string, unknown>;
}

export interface HeldSeatRef {
  seatId: number;
  label: string;
}

/** Phần trạng thái đặt vé được giữ qua các lượt hội thoại */
export interface BookingSession {
  movieId: number | null;
  movieTitle: string | null;
  showtimeId: number | null;
  selectedSeats: HeldSeatRef[];
  holdExpiresAt: string | null;
  orderId: number | null;
  activeWidget: GenerativeUIWidget | null;
}

export type SessionPatch = Partial<BookingSession>;
