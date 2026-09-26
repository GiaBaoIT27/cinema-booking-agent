import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from './redis.constant.js';

@Injectable()
export class RedisService implements OnApplicationShutdown {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {}

  // Ngắt kết nối an toàn khi ứng dụng NestJS shutdown
  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(
      `Closing Redis connection gracefully (Signal: ${signal})...`,
    );
    await this.redisClient.quit();
  }

  // Trả về raw client của ioredis khi cần thực hiện lệnh nâng cao chưa wrap
  getClient(): Redis {
    return this.redisClient;
  }

  /**
   * Lưu Key - Value đơn giản với thời gian sống TTL tùy chọn
   * @param key Redis Key
   * @param value Giá trị chuỗi
   * @param ttlSeconds Thời gian hết hạn tính bằng giây
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds && ttlSeconds > 0) {
      await this.redisClient.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.redisClient.set(key, value);
    }
  }

  // Lấy giá trị theo Key
  async get(key: string): Promise<string | null> {
    return this.redisClient.get(key);
  }

  // Xóa một hoặc nhiều Key
  async del(keys: string | string[]): Promise<number> {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    if (keyArray.length === 0) return 0;
    return this.redisClient.del(...keyArray);
  }

  // Kiểm tra Key có tồn tại trong Redis không
  async exists(key: string): Promise<boolean> {
    const result = await this.redisClient.exists(key);
    return result === 1;
  }

  /**
   * Lấy Atomic Lock cho 1 tài nguyên bằng lệnh SET NX PX
   * @param key Lock Key
   * @param value Lock Owner ID (VD: userId hoặc requestId)
   * @param ttlMs Thời gian giữ lock tính bằng miligiây
   */
  async acquireLock(
    key: string,
    value: string,
    ttlMs: number,
  ): Promise<boolean> {
    const result = await this.redisClient.set(key, value, 'PX', ttlMs, 'NX');
    return result === 'OK';
  }

  /**
   * Giải phóng Atomic Lock an toàn bằng Lua Script (Chỉ người sở hữu mới được xóa)
   * @param key Lock Key
   * @param value Lock Owner ID
   */
  async releaseLock(key: string, value: string): Promise<boolean> {
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
      else
          return 0
      end
    `;
    const result = await this.redisClient.eval(luaScript, 1, key, value);
    return result === 1;
  }

  /**
   * Pattern Cache-Aside: Lấy dữ liệu từ Cache, nếu không có sẽ gọi fetchFn để lấy từ DB và ghi ngược vào Cache.
   * Tự động parse/stringify JSON và fallback an toàn khi Redis có sự cố.
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number = 86400, // Mặc định 24 giờ
  ): Promise<T> {
    try {
      const cachedData = await this.redisClient.get(key);
      if (cachedData) {
        return JSON.parse(cachedData) as T;
      }
    } catch (error) {
      this.logger.error(`[Redis Error] Read fail for key: ${key}`, error);
    }

    // Cache Miss hoặc Redis lỗi: Gọi DB
    const freshData = await fetchFn();

    try {
      if (freshData !== undefined && freshData !== null) {
        await this.redisClient.set(
          key,
          JSON.stringify(freshData),
          'EX',
          ttlSeconds,
        );
      }
    } catch (error) {
      this.logger.error(`[Redis Error] Write fail for key: ${key}`, error);
    }

    return freshData;
  }

  /**
   * Xóa tất cả các Key khớp với Pattern (Ví dụ: 'cinema:fnb:*')
   * Sử dụng scanStream để tránh gây đơ Redis khi dữ liệu lớn.
   */
  async delByPattern(pattern: string): Promise<void> {
    try {
      const stream = this.redisClient.scanStream({
        match: pattern,
        count: 100,
      });
      const keysToDelete: string[] = [];

      for await (const resultKeys of stream) {
        keysToDelete.push(...resultKeys);
      }

      if (keysToDelete.length > 0) {
        await this.redisClient.del(...keysToDelete);
      }
    } catch (error) {
      this.logger.error(
        `[Redis Error] Delete pattern failed: ${pattern}`,
        error,
      );
    }
  }
}
