import { Injectable } from '@nestjs/common';

import { CinemasFacade } from '#modules/cinemas/public-api/index.js';
import type {
  ISeatCatalog,
  SeatRef,
} from '../../application/ports/seat-catalog.port.js';

/** Adapter: dịch port ISeatCatalog sang public API của module `cinemas`. */
@Injectable()
export class CinemasFacadeAdapter implements ISeatCatalog {
  constructor(private readonly cinemasFacade: CinemasFacade) {}

  async findByIds(seatIds: string[]): Promise<SeatRef[]> {
    const seats = await this.cinemasFacade.getSeatsByIds(seatIds);
    return seats.map((seat) => ({
      id: String(seat.id),
      auditoriumId: String(seat.auditoriumId),
      seatTypeId: String(seat.seatTypeId),
      rowLabel: seat.rowLabel,
      seatNumber: seat.seatNumber,
      status: seat.status,
    }));
  }
}
