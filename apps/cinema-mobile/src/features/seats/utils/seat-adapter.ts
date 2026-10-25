import type {
  ApiSeat,
  Seat,
  SeatCell,
  SeatMapLayout,
  ShowtimeSeatsResponse,
  ShowtimeSeatsView,
} from "../types/seat.types";

const SEAT_TYPE_MAP: Record<string, Seat["type"]> = {
  NORMAL: "standard",
  VIP: "vip",
  SWEETBOX: "couple",
};

/** Hàng ngắn đứng trước (A..Z rồi AA..), cùng độ dài thì theo chữ cái. */
const compareRowLabels = (a: string, b: string) =>
  a.length - b.length || a.localeCompare(b);

const getSpan = (api: ApiSeat) =>
  api.seatType === "SWEETBOX" || api.seatNumber.includes("-") ? 2 : 1;

export function toSeat(api: ApiSeat): Seat {
  return {
    id: api.seatId,
    label: api.seatNumber,
    type: SEAT_TYPE_MAP[api.seatType] ?? "standard",
    price: Number(api.price) || 0,
    // Chỉ ghế AVAILABLE mới chọn được; BOOKED hay trạng thái lạ đều khóa.
    isBooked: api.status !== "AVAILABLE",
  };
}

/**
 * Ghế chính khách đang giữ không còn "AVAILABLE" trên server, nhưng khách vẫn phải
 * thấy và bỏ chọn được: mở khóa các ghế đó.
 */
export function markOwnHeldSeats(
  layout: SeatMapLayout,
  ownHeldIds: ReadonlySet<number>,
): SeatMapLayout {
  if (ownHeldIds.size === 0) return layout;
  const unlock = (seat: Seat): Seat =>
    ownHeldIds.has(seat.id) && seat.isBooked
      ? { ...seat, isBooked: false }
      : seat;
  return {
    ...layout,
    seats: layout.seats.map(unlock),
    cells: layout.cells.map((c) => ({ ...c, seat: unlock(c.seat) })),
  };
}

/** Dựng lưới từ `seatMatrix` (rowLabel + columnNumber; ghế đôi chiếm 2 cột). */
export function buildSeatLayout(
  raw: ShowtimeSeatsResponse | null | undefined,
): SeatMapLayout {
  const matrix = raw && Array.isArray(raw.seatMatrix) ? raw.seatMatrix : [];
  const rowLabels = Array.from(new Set(matrix.map((s) => s.rowLabel))).sort(
    compareRowLabels,
  );
  const rowIndex = new Map(rowLabels.map((label, i) => [label, i]));

  const cells: SeatCell[] = matrix
    .map((api) => ({
      seat: toSeat(api),
      row: rowIndex.get(api.rowLabel) ?? 0,
      col: api.columnNumber,
      span: getSpan(api),
    }))
    .sort((a, b) => a.row - b.row || a.col - b.col);

  const columns = cells.reduce(
    (max, c) => Math.max(max, c.col + c.span - 1),
    0,
  );
  return { seats: cells.map((c) => c.seat), cells, rowLabels, columns };
}

/** Dùng làm `select` của React Query (hàm ở module scope nên tham chiếu ổn định). */
export function toSeatsView(raw: ShowtimeSeatsResponse): ShowtimeSeatsView {
  return {
    layout: buildSeatLayout(raw),
    info: {
      auditoriumName: raw.auditoriumName,
      totalSeats: raw.totalSeats,
      availableSeats: raw.availableSeats,
    },
  };
}
