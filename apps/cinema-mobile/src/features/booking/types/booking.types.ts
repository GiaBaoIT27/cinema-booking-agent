/** Khớp booking.type.ts của web. */
export interface SeatHoldPayload {
  showtimeId: number;
  seatIds: number[];
}

export interface HeldSeat {
  seatId: number;
  rowLabel: string;
  seatNumber: string;
}

/** POST /bookings/hold */
export interface HoldSeatsResponse {
  showtimeId: number;
  heldSeats: HeldSeat[];
  /** Giờ hết hạn theo đồng hồ server (ISO, UTC) */
  holdExpiresAt: string;
  /** Thời gian giữ ghế tính bằng ms (vd 660000 = 11 phút) */
  holdDurationMs: number;
  message: string;
}

/** POST /bookings/release */
export interface ReleaseSeatsResponse {
  showtimeId: number;
  releasedSeatIds: number[];
  message: string;
}

export interface SeatHoldSuccess {
  ok: true;
  /** Mốc hết hạn theo đồng hồ điện thoại (epoch ms) */
  expiresAt: number;
}
export interface SeatHoldFailure {
  ok: false;
  message: string;
}
export type SeatHoldResult = SeatHoldSuccess | SeatHoldFailure;

/** Ghế đang giữ, lưu trong store để tính tiền và hiển thị. */
export interface HeldSeatItem {
  seatId: number;
  label: string;
  seatType: string | null;
  price: number;
}
