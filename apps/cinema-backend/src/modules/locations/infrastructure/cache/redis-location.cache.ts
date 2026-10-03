import { Injectable } from '@nestjs/common';

import { RedisService } from '#src/core/redis/redis.service.js';
import type { ILocationCache } from '../../application/ports/location-cache.port.js';
import type {
  ProvinceResponseDto,
  WardResponseDto,
  PagedResultDto,
} from '../../application/dto/location-response.dto.js';
import type { ProvinceSearchOptions } from '../../domain/repositories/province.repository.interface.js';
import type { WardSearchOptions } from '../../domain/repositories/ward.repository.interface.js';
import {
  LOCATION_REDIS_KEYS,
  LOCATION_CACHE_TTL,
} from '../constants/location-redis.constant.js';

@Injectable()
export class RedisLocationCache implements ILocationCache {
  constructor(private readonly redisService: RedisService) {}

  getProvincePage(
    options: ProvinceSearchOptions,
    loader: () => Promise<PagedResultDto<ProvinceResponseDto>>,
  ): Promise<PagedResultDto<ProvinceResponseDto>> {
    const { type, keyword, page, limit } = options;
    const queryStr = `type=${type || 'all'}:kw=${keyword || 'none'}:p=${page}:l=${limit}`;
    return this.redisService.getOrSet(
      LOCATION_REDIS_KEYS.PROVINCES_LIST(queryStr),
      loader,
      LOCATION_CACHE_TTL,
    );
  }

  getWardPage(
    options: WardSearchOptions,
    loader: () => Promise<PagedResultDto<WardResponseDto>>,
  ): Promise<PagedResultDto<WardResponseDto>> {
    const { provinceId, type, keyword, page, limit } = options;
    const queryStr = `pId=${provinceId || 'all'}:type=${type || 'all'}:kw=${keyword || 'none'}:p=${page}:l=${limit}`;
    return this.redisService.getOrSet(
      LOCATION_REDIS_KEYS.WARDS_LIST(queryStr),
      loader,
      LOCATION_CACHE_TTL,
    );
  }

  getProvinceSummary(
    id: string,
    loader: () => Promise<ProvinceResponseDto | null>,
  ): Promise<ProvinceResponseDto | null> {
    return this.redisService.getOrSet(
      LOCATION_REDIS_KEYS.PROVINCE_BY_ID(id),
      loader,
      LOCATION_CACHE_TTL,
    );
  }

  getWardSummary(
    id: string,
    loader: () => Promise<WardResponseDto | null>,
  ): Promise<WardResponseDto | null> {
    return this.redisService.getOrSet(
      LOCATION_REDIS_KEYS.WARD_BY_ID(id),
      loader,
      LOCATION_CACHE_TTL,
    );
  }

  getAllProvinceSummaries(
    loader: () => Promise<ProvinceResponseDto[]>,
  ): Promise<ProvinceResponseDto[]> {
    return this.redisService.getOrSet(
      LOCATION_REDIS_KEYS.PROVINCES_LIST('all_summary'),
      loader,
      LOCATION_CACHE_TTL,
    );
  }

  async invalidateAll(): Promise<void> {
    await this.redisService.delByPattern(LOCATION_REDIS_KEYS.PATTERN_ALL);
  }
}
