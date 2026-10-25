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

/** Quản lý ghế đang giữ / đã bán – dữ liệu thuộc module `bookings`. */
export interface ISeatReservation {
  /** Ghế đang HOLDING còn hạn của user? Kèm giá snapshot từng ghế. */
  validateHolding(input: {
    userId: string;
    showtimeId: string;
    seatIds: string[];
  }): Promise<HoldingSeatsValidation>;

  /** HOLDING -> BOOKED (sau thanh toán). Trả về số ghế đã chốt. */
  markBooked(
    showtimeId: string,
    seatIds: string[],
    userId?: string,
  ): Promise<number>;

  /** Giải phóng ghế khi đơn bị hủy / hết hạn. */
  release(input: {
    showtimeId: string;
    seatIds: string[];
    userId?: string;
  }): Promise<void>;
}

export const SEAT_RESERVATION = Symbol('SEAT_RESERVATION');
