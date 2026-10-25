/** Body của POST /bookings/hold và POST /bookings/release */
export interface SeatHoldPayload {
  showtimeId: number;
  seatIds: number[];
}

export interface HeldSeat {
  seatId: number;
  rowLabel: string;
  seatNumber: string;
}

/** POST /api/v1/bookings/hold */
export interface HoldSeatsResponse {
  showtimeId: number;
  heldSeats: HeldSeat[];
  /** Giờ hết hạn theo đồng hồ server (ISO, UTC) */
  holdExpiresAt: string;
  /** Thời gian giữ ghế tính bằng mili giây (vd 660000 = 11 phút) */
  holdDurationMs: number;
  message: string;
}

/** POST /api/v1/bookings/release */
export interface ReleaseSeatsResponse {
  showtimeId: number;
  releasedSeatIds: number[];
  message: string;
}

/** Một suất chiếu có ghế đang giữ (cấu trúc chi tiết chưa rõ vì mẫu trả về đang rỗng) */
export type MyHoldShowtime = { showtimeId: number } & Record<string, unknown>;

/** GET /api/v1/bookings/my-holds */
export interface MyHoldsResponse {
  totalHolds: number;
  showtimes: MyHoldShowtime[];
}

/** Kết quả giữ ghế thành công, dùng trong giao diện */
export interface SeatHoldSuccess {
  ok: true;
  /** Mốc hết hạn theo đồng hồ trình duyệt (epoch ms) */
  expiresAt: number;
}

export interface SeatHoldFailure {
  ok: false;
  message: string;
}

export type SeatHoldResult = SeatHoldSuccess | SeatHoldFailure;
