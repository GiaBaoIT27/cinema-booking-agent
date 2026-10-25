import { Injectable } from '@nestjs/common';

import { RedisService } from '#src/core/redis/redis.service.js';
import type { ICineplexCache } from '../../application/ports/cineplex-cache.port.js';
import type { CineplexSearchCriteria } from '../../domain/repositories/cineplex.repository.interface.js';
import {
  CINEPLEX_REDIS_KEYS,
  CINEPLEX_CACHE_TTL,
  CINEPLEX_FNB_CACHE_TTL,
} from '../constants/cineplex-redis.constant.js';

@Injectable()
export class RedisCineplexCache implements ICineplexCache {
  constructor(private readonly redisService: RedisService) {}

  getPage<T>(
    criteria: CineplexSearchCriteria,
    loader: () => Promise<T>,
  ): Promise<T> {
    const { provinceId, wardId, geo, status, keyword, page, limit } = criteria;
    const queryStr =
      `p=${provinceId || 'null'}:w=${wardId || 'null'}` +
      `:lat=${geo?.latitude ?? 'null'}:lng=${geo?.longitude ?? 'null'}:r=${geo?.radiusKm ?? 'null'}` +
      `:st=${status || 'all'}:s=${keyword || 'null'}:p=${page}:l=${limit}`;

    return this.redisService.getOrSet(
      CINEPLEX_REDIS_KEYS.LIST(queryStr),
      loader,
      CINEPLEX_CACHE_TTL,
    );
  }

  getDetail<T>(id: string, loader: () => Promise<T>): Promise<T> {
    return this.redisService.getOrSet(
      CINEPLEX_REDIS_KEYS.DETAIL(id),
      loader,
      CINEPLEX_CACHE_TTL,
    );
  }

  getAuditoriums<T>(
    cineplexId: string,
    status: string,
    loader: () => Promise<T>,
  ): Promise<T> {
    return this.redisService.getOrSet(
      CINEPLEX_REDIS_KEYS.AUDITORIUMS(cineplexId, status),
      loader,
      CINEPLEX_CACHE_TTL,
    );
  }

  getFnbItems<T>(
    cineplexId: string,
    category: string | undefined,
    loader: () => Promise<T>,
  ): Promise<T> {
    return this.redisService.getOrSet(
      CINEPLEX_REDIS_KEYS.FNB_ITEMS(cineplexId, category || 'all'),
      loader,
      CINEPLEX_FNB_CACHE_TTL,
    );
  }

  async invalidateAll(): Promise<void> {
    await this.redisService.delByPattern(CINEPLEX_REDIS_KEYS.PATTERN_ALL);
  }
}
