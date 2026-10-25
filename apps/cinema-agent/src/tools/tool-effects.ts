import type { ToolResult } from "./definitions.js";
import type { GenerativeUIWidget, SessionPatch } from "../types/session.js";

type Args = Record<string, unknown>;
type Obj = Record<string, any>;

/** Quy đổi kết quả tool thành widget giao diện và cập nhật trạng thái đặt vé */
export function effectsFor(
  toolName: string,
  args: Args,
  result: ToolResult,
): { widget: GenerativeUIWidget | null; patch: SessionPatch } {
  if (!result.ok) {
    if (result.errorCode === "AUTH_REQUIRED") {
      return {
        widget: {
          type: "LOGIN_REQUIRED",
          title: "Cần đăng nhập để tiếp tục",
          payload: { message: result.message },
        },
        patch: {},
      };
    }
    return { widget: null, patch: {} };
  }

  const data = result.data as Obj;
  const ui = (result.ui ?? result.data) as Obj;

  switch (toolName) {
    case "search_movies":
      return {
        widget: {
          type: "MOVIE_LIST",
          title: "Phim phù hợp",
          payload: { movies: data.movies ?? [] },
        },
        patch: {},
      };

    case "get_showtimes":
      return {
        widget: {
          type: "SHOWTIME_SELECTOR",
          title: `Lịch chiếu "${data.movieTitle}" ngày ${data.date}`,
          payload: {
            movieId: data.movieId,
            movieTitle: data.movieTitle,
            date: data.date,
            cinemas: data.cinemas,
          },
        },
        patch: {
          movieId: Number(data.movieId),
          movieTitle: String(data.movieTitle),
        },
      };

    case "get_available_seats":
      return {
        widget: {
          type: "SEAT_MATRIX_SELECTOR",
          title: `Sơ đồ ghế - ${ui.auditoriumName}`,
          payload: {
            mode: "AVAILABILITY",
            showtimeId: ui.showtimeId,
            auditoriumName: ui.auditoriumName,
            totalSeats: ui.totalSeats,
            availableSeats: ui.availableSeats,
            seatMatrix: ui.seatMatrix,
          },
        },
        patch: { showtimeId: Number(ui.showtimeId) },
      };

    case "hold_seats": {
      const heldSeats = (data.heldSeats as Obj[]).map((s) => ({
        seatId: Number(s.seatId),
        label: String(s.seat),
      }));
      return {
        widget: {
          type: "SEAT_MATRIX_SELECTOR",
          title: `Đã giữ ghế ${heldSeats.map((s) => s.label).join(", ")}`,
          payload: {
            mode: "HELD",
            showtimeId: data.showtimeId,
            heldSeats,
            holdExpiresAt: data.holdExpiresAt,
            holdMinutes: data.holdMinutes,
            totalSeatPrice: data.totalSeatPrice,
          },
        },
        patch: {
          showtimeId: Number(data.showtimeId),
          selectedSeats: heldSeats,
          holdExpiresAt: String(data.holdExpiresAt),
        },
      };
    }

    case "release_seats":
      return {
        widget: null,
        patch: { selectedSeats: [], holdExpiresAt: null },
      };

    case "get_fnb_items":
      return {
        widget: {
          type: "FNB_SELECTOR",
          title: "Bắp & nước",
          payload: { items: ui.items ?? [] },
        },
        patch: {},
      };

    case "create_order_and_payment":
      return {
        widget: {
          type: "PAYMENT_SUMMARY",
          title: `Thanh toán đơn ${data.orderCode}`,
          payload: {
            orderId: data.orderId,
            orderCode: data.orderCode,
            seats: data.seats,
            pricing: data.pricing,
            expiresAt: data.expiresAt,
            paymentUrl: data.paymentUrl,
          },
        },
        patch: { orderId: Number(data.orderId) },
      };

    default:
      return { widget: null, patch: {} };
  }
}
