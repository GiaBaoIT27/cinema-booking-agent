import { Module } from '@nestjs/common';

import { ShowtimesModule } from '#modules/showtimes/showtimes.module.js';
import { CinemasModule } from '#modules/cinemas/cinemas.module.js';

import { SEAT_INVENTORY } from './application/ports/seat-inventory.port.js';
import { SHOWTIME_LOOKUP } from './application/ports/showtime-lookup.port.js';
import { SEAT_CATALOG } from './application/ports/seat-catalog.port.js';
import { SEAT_HOLD_STORE } from './application/ports/seat-hold-store.port.js';

import { RedisSeatHoldStore } from './infrastructure/redis/redis-seat-hold.store.js';
import { ShowtimeSeatsFacadeAdapter } from './infrastructure/adapters/showtime-seats-facade.adapter.js';
import { ShowtimesFacadeAdapter } from './infrastructure/adapters/showtimes-facade.adapter.js';
import { CinemasFacadeAdapter } from './infrastructure/adapters/cinemas-facade.adapter.js';

import { BookingsController } from './presentation/controllers/bookings.controller.js';
import { BookingsService } from './application/services/bookings.service.js';
import { SeatReservationsService } from './application/services/seat-reservations.service.js';
import { BookingsFacade } from './public-api/bookings.facade.js';

/**
 * Bookings không sở hữu bảng nào: nó điều phối việc giữ/bán ghế
 * (khóa Redis + quy tắc nghiệp vụ) trên dữ liệu của showtimes và cinemas.
 */
@Module({
  imports: [ShowtimesModule, CinemasModule],
  controllers: [BookingsController],
  providers: [
    // Redis
    { provide: SEAT_HOLD_STORE, useClass: RedisSeatHoldStore },
    // Cổng sang module khác
    { provide: SEAT_INVENTORY, useClass: ShowtimeSeatsFacadeAdapter },
    { provide: SHOWTIME_LOOKUP, useClass: ShowtimesFacadeAdapter },
    { provide: SEAT_CATALOG, useClass: CinemasFacadeAdapter },
    // Application
    BookingsService,
    SeatReservationsService,
    BookingsFacade,
  ],
  exports: [BookingsFacade], // Only export facade for other modules
})
export class BookingsModule {}
