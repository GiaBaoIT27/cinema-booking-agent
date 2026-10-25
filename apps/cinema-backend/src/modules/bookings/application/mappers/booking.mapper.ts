import { SEAT_HOLD_DURATION_MS } from '../../domain/rules/booking-rules.js';
import type { SeatHoldRecord } from '../ports/seat-inventory.port.js';
import type { SeatRef } from '../ports/seat-catalog.port.js';

/** POST /bookings/hold */
export function toHoldSeatsResponse(
  showtimeId: number,
  seats: SeatRef[],
  holdExpiresAt: Date,
) {
  return {
    showtimeId,
    heldSeats: seats.map((seat) => ({
      seatId: Number(seat.id),
      rowLabel: seat.rowLabel,
      seatNumber: seat.seatNumber,
    })),
    holdExpiresAt,
    holdDurationMs: SEAT_HOLD_DURATION_MS,
    message: `Giữ ghế thành công. Bạn có ${SEAT_HOLD_DURATION_MS / 60000} phút để hoàn tất đặt vé.`,
  };
}

/** POST /bookings/release */
export function toReleaseSeatsResponse(
  showtimeId: number,
  releasedSeatIds: string[],
) {
  return {
    showtimeId,
    releasedSeatIds: releasedSeatIds.map(Number),
    message:
      releasedSeatIds.length === 0
        ? 'Không có ghế nào đang được giữ bởi bạn để giải phóng'
        : 'Đã giải phóng ghế thành công',
  };
}

/** GET /bookings/my-holds – nhóm theo suất chiếu */
export function toMyHoldsResponse(
  holds: SeatHoldRecord[],
  seatsById: Map<string, SeatRef>,
) {
  const byShowtime = new Map<
    string,
    {
      seatId: number;
      rowLabel: string | null;
      seatNumber: string | null;
      holdExpiresAt: Date | null;
    }[]
  >();

  for (const hold of holds) {
    const seat = seatsById.get(hold.seatId);
    const list = byShowtime.get(hold.showtimeId) ?? [];
    list.push({
      seatId: Number(hold.seatId),
      rowLabel: seat?.rowLabel ?? null,
      seatNumber: seat?.seatNumber ?? null,
      holdExpiresAt: hold.holdExpiresAt,
    });
    byShowtime.set(hold.showtimeId, list);
  }

  return {
    totalHolds: holds.length,
    showtimes: Array.from(byShowtime.entries()).map(([showtimeId, seats]) => ({
      showtimeId: Number(showtimeId),
      seats,
    })),
  };
}
