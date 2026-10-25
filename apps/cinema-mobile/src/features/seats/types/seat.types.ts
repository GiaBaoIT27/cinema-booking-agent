/** Khớp seat.type.ts của web. */
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

/** GET /api/v1/showtimes/:showtimeId/seats */
export interface ShowtimeSeatsResponse {
  showtimeId: number;
  auditoriumName: string;
  totalSeats: number;
  availableSeats: number;
  seatMatrix: ApiSeat[];
}

export interface Seat {
  id: number;
  /** Số ghế hiển thị, vd "A1", "H7-H8" */
  label: string;
  type: "standard" | "vip" | "couple";
  price: number;
  /** true khi ghế không còn trống (status khác AVAILABLE) */
  isBooked: boolean;
}

export interface SeatCell {
  seat: Seat;
  /** Chỉ số hàng bắt đầu từ 0 */
  row: number;
  /** Cột bắt đầu từ 1 */
  col: number;
  /** 2 với ghế đôi */
  span: number;
}

export interface SeatMapLayout {
  seats: Seat[];
  cells: SeatCell[];
  rowLabels: string[];
  columns: number;
}

export interface ShowtimeSeatsInfo {
  auditoriumName: string;
  totalSeats: number;
  availableSeats: number;
}

export interface ShowtimeSeatsView {
  layout: SeatMapLayout;
  info: ShowtimeSeatsInfo;
}
