import type {
  ApiSeat,
  Seat,
  SeatCell,
  SeatMapLayout,
  ShowtimeSeatsResponse,
} from "../types/seat.type";

const SEAT_TYPE_MAP: Record<string, Seat["type"]> = {
  NORMAL: "standard",
  VIP: "vip",
  SWEETBOX: "couple",
};

const AVAILABLE_STATUS = "AVAILABLE";

/** Hàng ngắn đứng trước (A..Z rồi AA..), cùng độ dài thì theo chữ cái */
function compareRowLabels(a: string, b: string): number {
  return a.length - b.length || a.localeCompare(b);
}

function getSpan(api: ApiSeat): number {
  return api.seatType === "SWEETBOX" || api.seatNumber.includes("-") ? 2 : 1;
}

export function toSeat(api: ApiSeat): Seat {
  return {
    id: String(api.seatId),
    label: api.seatNumber,
    type: SEAT_TYPE_MAP[api.seatType] ?? "standard",
    price: Number(api.price) || 0,
    // Chỉ ghế AVAILABLE mới chọn được; BOOKED hay trạng thái lạ đều khóa
    isBooked: api.status !== AVAILABLE_STATUS,
  };
}

/**
 * Ghế chính khách đang giữ sẽ không còn "AVAILABLE" trên server (đã bị giữ),
 * nhưng khách vẫn phải thấy và bỏ chọn được chúng khi quay lại bước chọn ghế.
 * Hàm này mở khóa các ghế đó; ghế khác giữ nguyên trạng thái.
 */
export function markOwnHeldSeats(
  layout: SeatMapLayout,
  ownHeldIds: ReadonlySet<string>,
): SeatMapLayout {
  if (ownHeldIds.size === 0) return layout;

  const unlock = (seat: Seat): Seat =>
    ownHeldIds.has(seat.id) && seat.isBooked
      ? { ...seat, isBooked: false }
      : seat;

  return {
    ...layout,
    seats: layout.seats.map(unlock),
    cells: layout.cells.map((cell) => ({ ...cell, seat: unlock(cell.seat) })),
  };
}

/**
 * Dựng bố cục lưới từ `seatMatrix`. Backend không trả toạ độ nên suy ra từ
 * rowLabel + columnNumber; ghế đôi (SWEETBOX) chiếm 2 cột. Chỗ không có ghế
 * trong ma trận sẽ để trống thành lối đi.
 */
export function buildSeatLayout(
  raw: ShowtimeSeatsResponse | null | undefined,
): SeatMapLayout {
  const matrix = raw && Array.isArray(raw.seatMatrix) ? raw.seatMatrix : [];

  const rowLabels = Array.from(new Set(matrix.map((s) => s.rowLabel))).sort(
    compareRowLabels,
  );
  const rowIndex = new Map(rowLabels.map((label, index) => [label, index]));

  const cells: SeatCell[] = matrix
    .map((api) => ({
      seat: toSeat(api),
      row: rowIndex.get(api.rowLabel) ?? 0,
      col: api.columnNumber,
      span: getSpan(api),
    }))
    .sort((a, b) => a.row - b.row || a.col - b.col);

  const columns = cells.reduce(
    (max, cell) => Math.max(max, cell.col + cell.span - 1),
    0,
  );

  return { seats: cells.map((c) => c.seat), cells, columns };
}
