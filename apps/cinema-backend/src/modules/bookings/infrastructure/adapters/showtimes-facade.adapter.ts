import { Injectable } from '@nestjs/common';

import { ShowtimesFacade } from '#modules/showtimes/public-api/index.js';
import type {
  IShowtimeLookup,
  SeatPriceRef,
  ShowtimeRef,
} from '../../application/ports/showtime-lookup.port.js';

/** Adapter: dịch port IShowtimeLookup sang public API của module `showtimes`. */
@Injectable()
export class ShowtimesFacadeAdapter implements IShowtimeLookup {
  constructor(private readonly showtimesFacade: ShowtimesFacade) {}

  async findById(showtimeId: string): Promise<ShowtimeRef | null> {
    const showtime = await this.showtimesFacade.getShowtimeDetail(showtimeId);
    if (!showtime) return null;

    return {
      id: String(showtime.id),
      auditoriumId: String(showtime.auditoriumId),
      status: showtime.status,
    };
  }

  async getSeatPrices(showtimeId: string): Promise<SeatPriceRef[]> {
    const prices =
      await this.showtimesFacade.getSeatPricesForShowtime(showtimeId);
    return prices.map((price) => ({
      seatTypeId: String(price.seatTypeId),
      finalPrice: price.finalPrice,
    }));
  }
}
