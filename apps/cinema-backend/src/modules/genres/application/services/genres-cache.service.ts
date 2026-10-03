import { Injectable } from '@nestjs/common';
import { RedisService } from '#src/core/redis/redis.service.js';
import { GENRE_REDIS_KEYS } from '../../domain/constants/genre-redis.constant.js';

/** Cổng duy nhất của module Genres tới Redis cache. */
@Injectable()
export class GenresCacheService {
  constructor(private readonly redisService: RedisService) {}

  getOrSet<T>(
    key: string,
    loader: () => Promise<T>,
    ttlSeconds: number,
  ): Promise<T> {
    return this.redisService.getOrSet(key, loader, ttlSeconds) as Promise<T>;
  }

  /** Khi dữ liệu thể loại thay đổi: xóa toàn bộ cache liên quan (danh sách, chi tiết, phim theo thể loại). */
  async invalidateAll(): Promise<void> {
    await this.redisService.delByPattern(GENRE_REDIS_KEYS.PATTERN_ALL);
  }
}
