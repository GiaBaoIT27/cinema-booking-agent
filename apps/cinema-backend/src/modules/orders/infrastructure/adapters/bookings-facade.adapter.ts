import { Injectable } from '@nestjs/common';

import { BookingsFacade } from '#modules/bookings/public-api/index.js';
import type {
  HoldingSeatsValidation,
  ISeatReservation,
} from '../../application/ports/seat-reservation.port.js';

/** Adapter: dịch port ISeatReservation sang public API của module `bookings`. */
@Injectable()
export class BookingsFacadeAdapter implements ISeatReservation {
  constructor(private readonly bookingsFacade: BookingsFacade) {}

  validateHolding(input: {
    userId: string;
    showtimeId: string;
    seatIds: string[];
  }): Promise<HoldingSeatsValidation> {
    return this.bookingsFacade.validateHoldingSeats(input);
  }

  markBooked(
    showtimeId: string,
    seatIds: string[],
    userId?: string,
  ): Promise<number> {
    return this.bookingsFacade.markSeatsAsBooked(showtimeId, seatIds, userId);
  }

  release(input: {
    showtimeId: string;
    seatIds: string[];
    userId?: string;
  }): Promise<void> {
    return this.bookingsFacade.releaseSeatsForOrder(input);
  }
}
