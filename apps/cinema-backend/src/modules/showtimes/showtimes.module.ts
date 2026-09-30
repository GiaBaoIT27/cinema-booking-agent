import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Showtime } from './domain/entities/showtime.entity.js';
import { Seat } from '../cinemas/entities/seat.entity.js';
import { ShowtimeSeat } from './domain/entities/showtime-seat.entity.js';
import { ShowtimeSeatPrice } from './domain/entities/showtime-seat-price.entity.js';
import { PriceRule } from './domain/entities/price-rules.entity.js';
import { ShowtimeController } from './presentation/controllers/showtime.controller.js';
import { PriceRuleController } from './presentation/controllers/price-rule.controller.js';
import { ShowtimeService } from './application/services/showtime.service.js';
import { PriceRuleService } from './application/services/price-rule.service.js';
import { RedisModule } from '#src/core/redis/redis.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Showtime,
      Seat,
      ShowtimeSeat,
      ShowtimeSeatPrice,
      PriceRule,
    ]),
    RedisModule,
  ],
  controllers: [ShowtimeController, PriceRuleController],
  providers: [ShowtimeService, PriceRuleService],
  exports: [ShowtimeService],
})
export class ShowtimesModule {}
