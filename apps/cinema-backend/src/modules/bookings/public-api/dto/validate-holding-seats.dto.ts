export class ValidateHoldingSeatsInputDto {
  userId: string;
  showtimeId: string;
  seatIds: string[];
}

export class HeldSeatPriceDto {
  seatId: string;
  seatTypeId: string;
  price: number;
  ticketCode: string;
}

export class ValidateHoldingSeatsResultDto {
  isValid: boolean;
  subtotalTickets: number;
  seats: HeldSeatPriceDto[];
}
