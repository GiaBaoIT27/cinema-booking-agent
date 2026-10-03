import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SeatType } from './domain/entities/seat-type.entity.js';
import { SEAT_TYPE_REPOSITORY } from './domain/repositories/seat-types.repository.interface.js';
import { SEAT_TYPE_CACHE } from './application/ports/seat-type-cache.port.js';
import { SEAT_TYPE_USAGE_CHECKER } from './application/ports/seat-type-usage-checker.port.js';

import { TypeOrmSeatTypeRepository } from './infrastructure/persistence/typeorm-seat-type.repository.js';
import { RedisSeatTypeCache } from './infrastructure/cache/redis-seat-type.cache.js';
import { SqlSeatTypeUsageChecker } from './infrastructure/adapters/sql-seat-type-usage.checker.js';

import { SeatTypeController } from './presentation/controllers/seat-type.controller.js';
import { SeatTypesService } from './application/services/seat-type.service.js';
import { SeatTypesFacade } from './public-api/seat-types.facade.js';

@Module({
  imports: [TypeOrmModule.forFeature([SeatType])],
  controllers: [SeatTypeController],
  providers: [
    { provide: SEAT_TYPE_REPOSITORY, useClass: TypeOrmSeatTypeRepository },
    { provide: SEAT_TYPE_CACHE, useClass: RedisSeatTypeCache },
    { provide: SEAT_TYPE_USAGE_CHECKER, useClass: SqlSeatTypeUsageChecker },
    SeatTypesService,
    SeatTypesFacade,
  ],
  exports: [SeatTypesFacade],
})
export class SeatTypesModule {}
