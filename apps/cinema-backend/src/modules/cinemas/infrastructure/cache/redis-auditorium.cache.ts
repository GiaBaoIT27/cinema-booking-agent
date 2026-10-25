import { Injectable } from '@nestjs/common';

import { RedisService } from '#src/core/redis/redis.service.js';
import type { IAuditoriumCache } from '../../application/ports/auditorium-cache.port.js';
import type { AuditoriumSearchCriteria } from '../../domain/repositories/auditorium.repository.interface.js';
import {
  AUDITORIUM_REDIS_KEYS,
  AUDITORIUM_CACHE_TTL,
  SEATS_CACHE_TTL,
} from '../constants/auditorium-redis.constant.js';

@Injectable()
export class RedisAuditoriumCache implements IAuditoriumCache {
  constructor(private readonly redisService: RedisService) {}

  getPage<T>(
    criteria: AuditoriumSearchCriteria,
    loader: () => Promise<T>,
  ): Promise<T> {
    const { cineplexId, screenType, status, page, limit } = criteria;
    const queryStr = `cineplex=${cineplexId ?? 'all'}:screen=${screenType ?? 'all'}:status=${status || 'all'}:p=${page}:l=${limit}`;

    return this.redisService.getOrSet(
      AUDITORIUM_REDIS_KEYS.LIST(queryStr),
      loader,
      AUDITORIUM_CACHE_TTL,
    );
  }

  getDetail<T>(id: string, loader: () => Promise<T>): Promise<T> {
    return this.redisService.getOrSet(
      AUDITORIUM_REDIS_KEYS.DETAIL(id),
      loader,
      AUDITORIUM_CACHE_TTL,
    );
  }

  getSeatLayout<T>(auditoriumId: string, loader: () => Promise<T>): Promise<T> {
    return this.redisService.getOrSet(
      AUDITORIUM_REDIS_KEYS.SEATS(auditoriumId),
      loader,
      SEATS_CACHE_TTL,
    );
  }

  async invalidateAuditoriums(): Promise<void> {
    await Promise.all([
      this.redisService.delByPattern(AUDITORIUM_REDIS_KEYS.PATTERN_ALL),
      this.redisService.delByPattern(AUDITORIUM_REDIS_KEYS.PATTERN_CINEPLEXES),
    ]);
  }

  async invalidateSeatLayout(auditoriumId: string): Promise<void> {
    await Promise.all([
      this.redisService.del(AUDITORIUM_REDIS_KEYS.SEATS(auditoriumId)),
      this.redisService.del(AUDITORIUM_REDIS_KEYS.DETAIL(auditoriumId)),
      this.redisService.delByPattern(AUDITORIUM_REDIS_KEYS.PATTERN_ALL),
    ]);
  }
}
