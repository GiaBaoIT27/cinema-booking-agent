import type { Seat } from "../../seats/components/seat-selection-map";

/** Phần trạng thái của BookingContext liên quan đến ghế đang giữ */
export interface HoldSlice {
  showtimeId: string;
  selectedSeats: Seat[];
  /** id ghế → mốc hết hạn giữ (epoch ms, theo đồng hồ trình duyệt) */
  holdExpiries: Record<string, number>;
}

/**
 * Thêm một ghế vừa giữ thành công. Nếu đang giữ ghế của suất chiếu khác thì
 * bắt đầu lại từ ghế này (lượt giữ cũ đã được trả riêng).
 */
export function addHeldSeat<T extends HoldSlice>(
  prev: T,
  seat: Seat,
  showtimeId: string,
  expiresAt: number,
): T {
  const sameShowtime = prev.showtimeId === showtimeId;
  const seats = sameShowtime
    ? prev.selectedSeats.filter((s) => s.id !== seat.id)
    : [];
  const expiries = sameShowtime ? prev.holdExpiries : {};

  return {
    ...prev,
    showtimeId,
    selectedSeats: [...seats, seat],
    holdExpiries: { ...expiries, [seat.id]: expiresAt },
  };
}

/** Bỏ một ghế khỏi danh sách đang giữ */
export function removeHeldSeat<T extends HoldSlice>(
  prev: T,
  seatId: string,
): T {
  const holdExpiries = { ...prev.holdExpiries };
  delete holdExpiries[seatId];

  return {
    ...prev,
    selectedSeats: prev.selectedSeats.filter((s) => s.id !== seatId),
    holdExpiries,
  };
}

/** Xóa toàn bộ ghế đang giữ */
export function clearHolds<T extends HoldSlice>(prev: T): T {
  return { ...prev, selectedSeats: [], holdExpiries: {} };
}
