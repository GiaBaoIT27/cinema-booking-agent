/** Nội dung các widget do agent gửi qua sự kiện `ui_widget` */
export interface MovieSummary {
  movieId: number;
  title: string;
  originalTitle: string | null;
  genre: string;
  durationMinutes: number;
  ageRating: string;
  releaseDate: string | null;
  status: string;
  posterUrl: string | null;
}

export interface WidgetShowtime {
  showtimeId: number;
  auditorium: string;
  projectionType: string;
  startTime: string;
  endTime: string;
}

export interface WidgetCinema {
  cineplexId: number;
  cineplexName: string;
  showtimes: WidgetShowtime[];
}

export interface FnbWidgetItem {
  fnbItemId: number;
  name: string;
  category: string;
  price: number;
  description: string | null;
  imageUrl: string | null;
}

export interface OrderPricing {
  subtotalTickets: number;
  subtotalFnb: number;
  discountAmount: number;
  finalAmount: number;
}

export type AgentWidget =
  | { type: "MOVIE_LIST"; title: string; payload: { movies: MovieSummary[] } }
  | {
      type: "SHOWTIME_SELECTOR";
      title: string;
      payload: {
        movieId: number;
        movieTitle: string;
        date: string;
        cinemas: WidgetCinema[];
      };
    }
  | {
      type: "SEAT_MATRIX_SELECTOR";
      title: string;
      payload:
        | {
            mode: "AVAILABILITY";
            showtimeId: number;
            auditoriumName: string;
            totalSeats: number;
            availableSeats: number;
          }
        | {
            mode: "HELD";
            showtimeId: number;
            heldSeats: { seatId: number; label: string }[];
            holdExpiresAt: string;
            holdMinutes: number;
            totalSeatPrice: number;
          };
    }
  | { type: "FNB_SELECTOR"; title: string; payload: { items: FnbWidgetItem[] } }
  | {
      type: "PAYMENT_SUMMARY";
      title: string;
      payload: {
        orderId: number;
        orderCode: string;
        seats: string[];
        pricing: OrderPricing;
        expiresAt: string;
        paymentUrl: string;
      };
    }
  | { type: "LOGIN_REQUIRED"; title: string; payload: { message: string } };

export interface AgentStateSync {
  sessionId: string;
  movieId: number | null;
  movieTitle: string | null;
  showtimeId: number | null;
  selectedSeats: { seatId: number; label: string }[];
  holdExpiresAt: string | null;
  orderId: number | null;
}

/** Các sự kiện SSE của cinema-agent */
export type AgentEvent =
  | { event: "session"; data: { sessionId: string } }
  | { event: "token"; data: { text: string } }
  | { event: "tool_start"; data: { name: string } }
  | { event: "tool_end"; data: { name: string; ok: boolean } }
  | { event: "ui_widget"; data: AgentWidget }
  | { event: "state_sync"; data: AgentStateSync }
  | { event: "error"; data: { code: string; message: string } }
  | { event: "end"; data: { status: "COMPLETED" | "FAILED" } };

export interface ChatMessage {
  id: string;
  sender: "user" | "agent";
  text: string;
  timestamp: string;
  widgets: AgentWidget[];
  /** Dòng trạng thái tạm thời, ví dụ "Đang tra lịch chiếu..." */
  status: string | null;
  error: string | null;
}
