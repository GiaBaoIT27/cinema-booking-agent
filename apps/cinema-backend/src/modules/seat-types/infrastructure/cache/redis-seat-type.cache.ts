import { Injectable } from '@nestjs/common';

import { RedisService } from '#src/core/redis/redis.service.js';
import { SeatType } from '../../domain/entities/seat-type.entity.js';
import type { ISeatTypeCache } from '../../application/ports/seat-type-cache.port.js';
import {
  SEAT_TYPE_REDIS_KEYS,
  SEAT_TYPE_CACHE_TTL,
} from '../constants/seat-type-redis.constant.js';

@Injectable()
export class RedisSeatTypeCache implements ISeatTypeCache {
  constructor(private readonly redisService: RedisService) {}

  getAll(loader: () => Promise<SeatType[]>): Promise<SeatType[]> {
    return this.redisService.getOrSet(
      SEAT_TYPE_REDIS_KEYS.ALL,
      loader,
      SEAT_TYPE_CACHE_TTL,
    );
  }

  getById(
    id: string,
    loader: () => Promise<SeatType | null>,
  ): Promise<SeatType | null> {
    return this.redisService.getOrSet(
      SEAT_TYPE_REDIS_KEYS.DETAIL(id),
      loader,
      SEAT_TYPE_CACHE_TTL,
    );
  }

  async invalidate(id?: string): Promise<void> {
    await this.redisService.del(
      id
        ? [SEAT_TYPE_REDIS_KEYS.ALL, SEAT_TYPE_REDIS_KEYS.DETAIL(id)]
        : SEAT_TYPE_REDIS_KEYS.ALL,
    );
  }
}
