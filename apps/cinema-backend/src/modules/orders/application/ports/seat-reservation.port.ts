export interface HoldingSeatsValidation {
  isValid: boolean;
  subtotalTickets: number;
  seats: Array<{
    seatId: string;
    seatTypeId: string;
    price: number;
    ticketCode: string;
  }>;
}

export interface OrderSeats {
  showtimeId: string;
  seatIds: string[];
  orderCode: string;
  userId?: string;
}

/** Quản lý ghế đang giữ / đã bán – dữ liệu thuộc module `bookings`. */
export interface ISeatReservation {
  /** Ghế đang HOLDING còn hạn (chưa gắn đơn) của user? Kèm giá snapshot từng ghế. */
  validateHolding(input: {
    userId: string;
    showtimeId: string;
    seatIds: string[];
  }): Promise<HoldingSeatsValidation>;

  /**
   * Gắn ghế user đang giữ vào đơn `orderCode`, gia hạn giữ tới `holdUntil` (all-or-nothing).
   * @returns false nếu có ghế không còn được user giữ / đã thuộc đơn khác.
   */
  reserveForOrder(input: {
    showtimeId: string;
    seatIds: string[];
    userId: string;
    orderCode: string;
    holdUntil: Date;
  }): Promise<boolean>;

  /** Gỡ gắn đơn khỏi ghế (bù trừ khi tạo đơn thất bại). */
  cancelReservationForOrder(input: OrderSeats): Promise<void>;

  /** HOLDING -> BOOKED cho ghế của đơn (all-or-nothing). false => không chốt được. */
  markBooked(input: OrderSeats): Promise<boolean>;

  /** Toàn bộ ghế của đơn đã BOOKED cho chính đơn đó? (phân biệt request lặp với mất ghế) */
  isBookedForOrder(input: OrderSeats): Promise<boolean>;

  /** BOOKED -> HOLDING cho ghế của đơn (bù trừ khi ghi đơn/vé thất bại). */
  revertBooked(input: OrderSeats): Promise<void>;

  /** Giải phóng ghế HOLDING của đơn khi đơn bị hủy / hết hạn. */
  release(input: OrderSeats): Promise<void>;
}

export const SEAT_RESERVATION = Symbol('SEAT_RESERVATION');
