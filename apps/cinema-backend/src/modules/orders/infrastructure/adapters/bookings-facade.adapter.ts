import { Injectable } from '@nestjs/common';

import { BookingsFacade } from '#modules/bookings/public-api/index.js';
import type {
  HoldingSeatsValidation,
  ISeatReservation,
  OrderSeats,
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

  reserveForOrder(input: {
    showtimeId: string;
    seatIds: string[];
    userId: string;
    orderCode: string;
    holdUntil: Date;
  }): Promise<boolean> {
    return this.bookingsFacade.reserveSeatsForOrder(input);
  }

  cancelReservationForOrder(input: OrderSeats): Promise<void> {
    return this.bookingsFacade.cancelSeatReservationForOrder(input);
  }

  markBooked(input: OrderSeats): Promise<boolean> {
    return this.bookingsFacade.markSeatsAsBooked(input);
  }

  isBookedForOrder(input: OrderSeats): Promise<boolean> {
    return this.bookingsFacade.isSeatsBookedForOrder(input);
  }

  revertBooked(input: OrderSeats): Promise<void> {
    return this.bookingsFacade.revertSeatsBooked(input);
  }

  release(input: OrderSeats): Promise<void> {
    return this.bookingsFacade.releaseSeatsForOrder(input);
  }
}
