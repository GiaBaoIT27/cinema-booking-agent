/** Một ghế đúng như backend trả về trong `seatMatrix` */
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

/** Ghế dùng trong giao diện và trong BookingContext */
export interface Seat {
  /** String(seatId) từ backend */
  id: string;
  /** Số ghế hiển thị, vd "A1", "H7-H8" */
  label: string;
  type: "standard" | "vip" | "couple";
  price: number;
  /** true khi ghế không còn trống (status khác AVAILABLE) */
  isBooked?: boolean;
}

/** Vị trí của ghế trên lưới (bắt đầu từ 0 cho hàng, 1 cho cột) */
export interface SeatCell {
  seat: Seat;
  row: number;
  col: number;
  /** Số cột chiếm chỗ: 2 với ghế đôi */
  span: number;
}

export interface SeatMapLayout {
  /** Toàn bộ ghế, đã sắp theo hàng rồi cột */
  seats: Seat[];
  cells: SeatCell[];
  /** Số cột của lưới */
  columns: number;
}

export interface ShowtimeSeatsInfo {
  auditoriumName: string;
  totalSeats: number;
  availableSeats: number;
}
