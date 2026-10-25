export interface ApiSeat {
  seatId: number;
  rowLabel: string;
  columnNumber: number;
  /** Ghế đôi có dạng "H7-H8" */
  seatNumber: string;
  /** NORMAL | VIP | SWEETBOX */
  seatType: string;
  /** AVAILABLE | BOOKED | ... */
  status: string;
  price: number;
}

export interface ResolvedSeats {
  /** Ghế còn dùng được (chưa có người đặt) */
  seats: ApiSeat[];
  /** Ghế đã tìm thấy nhưng trạng thái là đã đặt/đã bán */
  takenSeats: ApiSeat[];
  /** Nhãn khách nhập mà không có ghế nào tương ứng */
  unknown: string[];
  /** Ghế đã có người đặt (status BOOKED/SOLD...) */
  taken: string[];
}

const TAKEN_STATUSES = new Set(["BOOKED", "SOLD", "RESERVED", "UNAVAILABLE", "BLOCKED", "MAINTENANCE"]);

const norm = (s: string) => s.trim().toUpperCase().replace(/\s+/g, "");

/**
 * Đổi nhãn ghế khách nói ("H7", "h7-h8") thành ghế thật của suất chiếu.
 * Ghế đôi "H7-H8" khớp cả khi khách chỉ nói "H7" hoặc "H8".
 */
export function resolveSeats(labels: string[], matrix: ApiSeat[]): ResolvedSeats {
  const byLabel = new Map<string, ApiSeat>();
  for (const seat of matrix) {
    const full = norm(seat.seatNumber);
    byLabel.set(full, seat);
    if (full.includes("-")) {
      for (const part of full.split("-")) if (part && !byLabel.has(part)) byLabel.set(part, seat);
    }
  }

  const seats: ApiSeat[] = [];
  const unknown: string[] = [];
  const taken: string[] = [];
  const takenSeats: ApiSeat[] = [];
  const seen = new Set<number>();

  for (const raw of labels) {
    const seat = byLabel.get(norm(raw));
    if (!seat) {
      unknown.push(raw);
      continue;
    }
    if (seen.has(seat.seatId)) continue;
    seen.add(seat.seatId);
    if (TAKEN_STATUSES.has(seat.status.toUpperCase())) {
      taken.push(seat.seatNumber);
      takenSeats.push(seat);
      continue;
    }
    seats.push(seat);
  }
  return { seats, takenSeats, unknown, taken };
}
