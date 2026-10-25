import { Injectable } from '@nestjs/common';

import { ShowtimesFacade } from '#modules/showtimes/public-api/index.js';
import type {
  ISeatInventory,
  SeatHoldRecord,
} from '../../application/ports/seat-inventory.port.js';

/** Adapter: dịch port ISeatInventory sang public API của module `showtimes`. */
@Injectable()
export class ShowtimeSeatsFacadeAdapter implements ISeatInventory {
  constructor(private readonly showtimesFacade: ShowtimesFacade) {}

  findBookedSeatIds(showtimeId: string, seatIds: string[]): Promise<string[]> {
    return this.showtimesFacade.findBookedSeatIds(showtimeId, seatIds);
  }

  findActiveHolds(
    showtimeId: string,
    seatIds: string[],
    userId: string,
    now: Date,
  ): Promise<SeatHoldRecord[]> {
    return this.showtimesFacade.findActiveSeatHolds(
      showtimeId,
      seatIds,
      userId,
      now,
    );
  }

  findActiveHoldsByUser(userId: string, now: Date): Promise<SeatHoldRecord[]> {
    return this.showtimesFacade.findActiveSeatHoldsByUser(userId, now);
  }

  findExpiredHolds(now: Date): Promise<SeatHoldRecord[]> {
    return this.showtimesFacade.findExpiredSeatHolds(now);
  }

  saveHolds(
    showtimeId: string,
    seatIds: string[],
    userId: string,
    expiresAt: Date,
  ): Promise<void> {
    return this.showtimesFacade.saveSeatHolds(
      showtimeId,
      seatIds,
      userId,
      expiresAt,
    );
  }

  releaseHolds(
    showtimeId: string,
    seatIds: string[],
    userId: string,
  ): Promise<number> {
    return this.showtimesFacade.releaseSeatHolds(showtimeId, seatIds, userId);
  }

  markBooked(showtimeId: string, seatIds: string[]): Promise<number> {
    return this.showtimesFacade.markSeatsBooked(showtimeId, seatIds);
  }

  releaseForOrder(
    showtimeId: string,
    seatIds: string[],
    userId?: string,
  ): Promise<void> {
    return this.showtimesFacade.releaseSeatsForOrder(
      showtimeId,
      seatIds,
      userId,
    );
  }

  releaseExpiredHolds(now: Date): Promise<void> {
    return this.showtimesFacade.releaseExpiredSeatHolds(now);
  }

  async releaseHoldsForShowtimes(showtimeIds: string[]): Promise<void> {
    await this.showtimesFacade.releaseSeatHoldsForShowtimes(showtimeIds);
  }
}
