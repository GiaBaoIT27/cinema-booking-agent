import { ShowtimeSeat } from '../../domain/entities/showtime-seat.entity.js';
import type { SeatHoldSummaryDto } from '../../public-api/dto/seat-hold.dto.js';

/** Map entity ShowtimeSeat → SeatHoldSummaryDto (công khai ra ngoài module) */
export function toSeatHoldSummary(seat: ShowtimeSeat): SeatHoldSummaryDto {
  return {
    showtimeId: seat.showtimeId,
    seatId: seat.seatId,
    userId: seat.userId,
    holdExpiresAt: seat.holdExpiresAt,
  };
}
