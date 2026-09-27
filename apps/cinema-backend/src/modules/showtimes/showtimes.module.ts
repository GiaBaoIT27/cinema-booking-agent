import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Showtime } from '#modules/showtimes/entities/showtime.entity.js';
import { Seat } from '../cinemas/entities/seat.entity.js';
import { ShowtimeSeat } from './entities/showtime-seat.entity.js';
import { ShowtimeSeatPrice } from './entities/showtime-seat-price.entity.js';
import { PriceRule } from './entities/price-rules.entity.js';
import { ShowtimeController } from './controllers/showtime.controller.js';
import { PriceRuleController } from './controllers/price-rule.controller.js';
import { ShowtimeService } from './services/showtime.service.js';
import { PriceRuleService } from './services/price-rule.service.js';
import { RedisModule } from '#src/common/redis/redis.module.js';

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
