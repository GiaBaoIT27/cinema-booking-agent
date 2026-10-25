import { ShowtimeSeatPrice } from '../entities/showtime-seat-price.entity.js';

export interface IShowtimeSeatPriceRepository {
  findByShowtimeId(showtimeId: string): Promise<ShowtimeSeatPrice[]>;

  findByShowtimeIdWithSeatType(
    showtimeId: string,
  ): Promise<ShowtimeSeatPrice[]>;

  findOne(
    showtimeId: string,
    seatTypeId: string,
  ): Promise<ShowtimeSeatPrice | null>;

  save(
    price: Partial<ShowtimeSeatPrice> | ShowtimeSeatPrice,
  ): Promise<ShowtimeSeatPrice>;
}

export const SHOWTIME_SEAT_PRICE_REPOSITORY = Symbol(
  'SHOWTIME_SEAT_PRICE_REPOSITORY',
);
