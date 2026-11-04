export interface ValidateHoldingSeatsInput {
  userId: string;
  showtimeId: string;
  seatIds: string[];
}

export interface ValidateHoldingSeatsResult {
  isValid: boolean;
  subtotalTickets: number;
  seats: Array<{
    seatId: string;
    seatTypeId: string;
    price: number;
    ticketCode: string;
  }>;
}

export interface ReleaseSeatsForOrderInput {
  showtimeId: string;
  seatIds: string[];
  orderCode: string;
  userId?: string;
}

export interface ReserveSeatsForOrderInput {
  showtimeId: string;
  seatIds: string[];
  userId: string;
  orderCode: string;
  holdUntil: Date;
}

export interface OrderSeatsInput {
  showtimeId: string;
  seatIds: string[];
  orderCode: string;
  userId?: string;
}
