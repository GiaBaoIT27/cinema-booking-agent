import { Injectable } from '@nestjs/common';
import { RedisService } from '#src/core/redis/redis.service.js';
import { MOVIE_REDIS_KEYS } from '../../domain/constants/movie-redis.constant.js';

/** Cổng duy nhất của module Movies tới Redis cache. */
@Injectable()
export class MoviesCacheService {
  constructor(private readonly redisService: RedisService) {}

  getOrSet<T>(
    key: string,
    loader: () => Promise<T>,
    ttlSeconds: number,
  ): Promise<T> {
    return this.redisService.getOrSet(key, loader, ttlSeconds) as Promise<T>;
  }

  /** Khi thêm phim mới: chỉ các danh sách bị ảnh hưởng. */
  async invalidateAll(): Promise<void> {
    await this.redisService.delByPattern(MOVIE_REDIS_KEYS.PATTERN_ALL);
  }

  /** Khi sửa / xóa / đổi trạng thái / đổi thể loại: chi tiết phim + toàn bộ danh sách. */
  async invalidateMovie(id: number | string): Promise<void> {
    await Promise.all([
      this.redisService.del(MOVIE_REDIS_KEYS.DETAIL(id)),
      this.redisService.delByPattern(MOVIE_REDIS_KEYS.PATTERN_ALL),
    ]);
  }
}
