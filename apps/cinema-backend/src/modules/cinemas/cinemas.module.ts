import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LocationsModule } from '#modules/locations/locations.module.js';
import { SeatTypesModule } from '#modules/seat-types/seat-types.module.js';
import { FnbModule } from '../fnb/fnb.module.js';

import { Cineplex } from './domain/entities/cineplex.entity.js';
import { Auditorium } from './domain/entities/auditorium.entity.js';
import { Seat } from './domain/entities/seat.entity.js';
import { UNIT_OF_WORK } from './domain/ports/transaction.port.js';
import { CINEPLEX_REPOSITORY } from './domain/repositories/cineplex.repository.interface.js';
import { AUDITORIUM_REPOSITORY } from './domain/repositories/auditorium.repository.interface.js';
import { SEAT_REPOSITORY } from './domain/repositories/seat.repository.interface.js';

import { LOCATION_LOOKUP } from './application/ports/location-lookup.port.js';
import { SEAT_TYPE_LOOKUP } from './application/ports/seat-type-lookup.port.js';
import { FNB_CATALOG_GATEWAY } from './application/ports/fnb-lookup.port.js';
import { CINEPLEX_CACHE } from './application/ports/cineplex-cache.port.js';
import { AUDITORIUM_CACHE } from './application/ports/auditorium-cache.port.js';

import { TypeOrmCineplexRepository } from './infrastructure/persistence/typeorm-cineplex.repository.js';
import { TypeOrmAuditoriumRepository } from './infrastructure/persistence/typeorm-auditorium.repository.js';
import { TypeOrmSeatRepository } from './infrastructure/persistence/typeorm-seat.repository.js';
import { TypeOrmUnitOfWork } from './infrastructure/persistence/typeorm-unit-of-work.js';
import { RedisCineplexCache } from './infrastructure/cache/redis-cineplex.cache.js';
import { RedisAuditoriumCache } from './infrastructure/cache/redis-auditorium.cache.js';
import { LocationsFacadeAdapter } from './infrastructure/adapters/locations-facade.adapter.js';
import { SeatTypesFacadeAdapter } from './infrastructure/adapters/seat-types-facade.adapter.js';
import { FnbFacadeAdapter } from './infrastructure/adapters/fnb-facade.adapter.js';

import { CineplexesController } from './presentation/controllers/cineplexes.controller.js';
import { AuditoriumsController } from './presentation/controllers/auditoriums.controller.js';
import { SeatsController } from './presentation/controllers/seats.controller.js';
import { CineplexesService } from './application/services/cineplexes.service.js';
import { AuditoriumsService } from './application/services/auditoriums.service.js';
import { SeatsService } from './application/services/seats.service.js';
import { CinemasFacade } from './public-api/cinemas.facade.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cineplex, Auditorium, Seat]),
    LocationsModule,
    SeatTypesModule,
    FnbModule,
  ],
  controllers: [CineplexesController, AuditoriumsController, SeatsController],
  providers: [
    // Persistence
    { provide: CINEPLEX_REPOSITORY, useClass: TypeOrmCineplexRepository },
    { provide: AUDITORIUM_REPOSITORY, useClass: TypeOrmAuditoriumRepository },
    { provide: SEAT_REPOSITORY, useClass: TypeOrmSeatRepository },
    { provide: UNIT_OF_WORK, useClass: TypeOrmUnitOfWork },
    // Cache
    { provide: CINEPLEX_CACHE, useClass: RedisCineplexCache },
    { provide: AUDITORIUM_CACHE, useClass: RedisAuditoriumCache },
    // Cổng sang module khác
    { provide: LOCATION_LOOKUP, useClass: LocationsFacadeAdapter },
    { provide: SEAT_TYPE_LOOKUP, useClass: SeatTypesFacadeAdapter },
    { provide: FNB_CATALOG_GATEWAY, useClass: FnbFacadeAdapter },
    // Application
    CineplexesService,
    AuditoriumsService,
    SeatsService,
    CinemasFacade,
  ],
  exports: [CinemasFacade], // Only export facade for other modules
})
export class CinemasModule {}
