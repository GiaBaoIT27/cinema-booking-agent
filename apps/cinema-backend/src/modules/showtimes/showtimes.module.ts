import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Showtime } from './domain/entities/showtime.entity.js';
import { ShowtimeSeat } from './domain/entities/showtime-seat.entity.js';
import { ShowtimeSeatPrice } from './domain/entities/showtime-seat-price.entity.js';
import { PriceRule } from './domain/entities/price-rules.entity.js';

import { ShowtimeController } from './presentation/controllers/showtime.controller.js';
import { PriceRuleController } from './presentation/controllers/price-rule.controller.js';
import { CineplexShowtimesController } from './presentation/controllers/cineplex-showtimes.controller.js';
import { MovieShowtimesController } from './presentation/controllers/movie-showtimes.controller.js';

import { ShowtimeService } from './application/services/showtime.service.js';
import { PriceRuleService } from './application/services/price-rule.service.js';
import { CineplexShowtimesService } from './application/services/cineplex-showtimes.service.js';
import { MovieShowtimesService } from './application/services/movie-showtimes.service.js';

import { ShowtimeSchedulingService } from './application/services/showtime-scheduling.service.js';
import { PriceCalculationService } from './application/services/price-calculation.service.js';
import { OnCinemaVenueDeactivatedHandler } from './application/event-handlers/on-cinema-venue-deactivated.handler.js';

import { ShowtimesFacade } from './public-api/showtimes.facade.js';
import { SHOWTIME_REPOSITORY } from './domain/repositories/showtime.repository.interface.js';
import { PRICE_RULE_REPOSITORY } from './domain/repositories/price-rule.repository.interface.js';
import { SHOWTIME_SEAT_REPOSITORY } from './domain/repositories/showtime-seat.repository.interface.js';
import { SHOWTIME_SEAT_PRICE_REPOSITORY } from './domain/repositories/showtime-seat-price.repository.interface.js';
import { TypeOrmShowtimeRepository } from './infrastructure/persistence/typeorm-showtime.repository.js';
import { TypeOrmPriceRuleRepository } from './infrastructure/persistence/typeorm-price-rule.repository.js';
import { TypeOrmShowtimeSeatRepository } from './infrastructure/persistence/typeorm-showtime-seat.repository.js';
import { TypeOrmShowtimeSeatPriceRepository } from './infrastructure/persistence/typeorm-showtime-seat-price.repository.js';
import { RedisModule } from '#src/core/redis/redis.module.js';
import { MoviesModule } from '#modules/movies/movies.module.js';
import { CinemasModule } from '#modules/cinemas/cinemas.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Showtime,
      ShowtimeSeat,
      ShowtimeSeatPrice,
      PriceRule,
    ]),
    RedisModule,
    // Showtimes cần MoviesFacade + CinemasFacade để validate liên module
    MoviesModule,
    CinemasModule,
  ],
  controllers: [
    ShowtimeController,
    PriceRuleController,
    CineplexShowtimesController,
    MovieShowtimesController,
  ],
  providers: [
    // Repositories (domain port ← TypeORM adapter)
    { provide: SHOWTIME_REPOSITORY, useClass: TypeOrmShowtimeRepository },
    { provide: PRICE_RULE_REPOSITORY, useClass: TypeOrmPriceRuleRepository },
    {
      provide: SHOWTIME_SEAT_REPOSITORY,
      useClass: TypeOrmShowtimeSeatRepository,
    },
    {
      provide: SHOWTIME_SEAT_PRICE_REPOSITORY,
      useClass: TypeOrmShowtimeSeatPriceRepository,
    },
    // Application
    ShowtimeSchedulingService,
    PriceCalculationService,
    ShowtimeService,
    PriceRuleService,
    CineplexShowtimesService,
    MovieShowtimesService,
    // Domain event listener: cinemas vô hiệu hóa phòng/cụm rạp → tự hủy suất chiếu
    OnCinemaVenueDeactivatedHandler,
    ShowtimesFacade,
  ],
  exports: [ShowtimesFacade],
})
export class ShowtimesModule {}
