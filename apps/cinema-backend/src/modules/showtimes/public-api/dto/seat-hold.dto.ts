export class SeatHoldSummaryDto {
  showtimeId: string;
  seatId: string;
  userId: string | null;
  holdExpiresAt: Date | null;
}
