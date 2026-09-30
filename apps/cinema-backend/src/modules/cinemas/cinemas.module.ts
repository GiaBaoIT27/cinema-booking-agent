import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';

import { Cineplex } from './entities/cineplex.entity.js';
import { Auditorium } from './entities/auditorium.entity.js';
import { Seat } from './entities/seat.entity.js';
import { SeatType } from '#modules/seat-types/entities/seat-type.entity.js';
import { Showtime } from '#modules/showtimes/domain/entities/showtime.entity.js';
import { FnbItem } from '#modules/fnb/entities/fnb-item.entities.js';

import { CineplexController } from './controllers/cineplex.controller.js';
import { AuditoriumController } from './controllers/auditorium.controller.js';
import { SeatsController } from './controllers/seat.controller.js';
import { CineplexService } from './services/cineplex.service.js';
import { AuditoriumService } from './services/auditorium.service.js';
import { SeatsService } from './services/seat.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cineplex,
      Auditorium,
      Seat,
      Showtime,
      FnbItem,
      SeatType,
    ]),
    CacheModule.register(),
  ],
  controllers: [CineplexController, AuditoriumController, SeatsController],
  providers: [CineplexService, AuditoriumService, SeatsService],
  exports: [CineplexService, AuditoriumService, SeatsService], // Export Service để các Module khác (Showtime, Booking...) tái sử dụng
})
export class CinemasModule {}
