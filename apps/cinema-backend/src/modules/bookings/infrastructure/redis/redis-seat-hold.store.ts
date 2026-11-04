import { Injectable, Logger } from '@nestjs/common';

import { RedisService } from '#src/core/redis/redis.service.js';
import type { ISeatHoldStore } from '../../application/ports/seat-hold-store.port.js';
import { BOOKING_REDIS_KEYS } from '../constants/booking-redis.constant.js';

@Injectable()
export class RedisSeatHoldStore implements ISeatHoldStore {
  private readonly logger = new Logger(RedisSeatHoldStore.name);

  constructor(private readonly redisService: RedisService) {}

  async acquire(
    showtimeId: string,
    seatIds: string[],
    userId: string,
    ttlMs: number,
  ): Promise<Date | null> {
    // 1. Khóa lần lượt từng ghế; một ghế thất bại => hoàn trả các ghế đã khóa
    const acquired: string[] = [];
    for (const seatId of seatIds) {
      const ok = await this.redisService.acquireLock(
        BOOKING_REDIS_KEYS.SEAT_LOCK(showtimeId, seatId),
        userId,
        ttlMs,
      );
      if (!ok) {
        this.logger.warn(
          `Khóa ghế ${seatId} thất bại cho suất chiếu ${showtimeId}. Đang rollback các ghế: [${acquired.join(', ')}]`,
        );
        await this.unlock(showtimeId, acquired, userId);
        return null;
      }
      acquired.push(seatId);
    }

    // 2. Ghi trạng thái giữ vào Hash (cho endpoint xem sơ đồ ghế đọc realtime)
    const expiresAt = new Date(Date.now() + ttlMs);
    const payload = JSON.stringify({
      userId,
      expiresAt: expiresAt.toISOString(),
    });
    const fields: Record<string, string> = {};
    for (const seatId of seatIds) fields[seatId] = payload;

    const client = this.redisService.getClient();
    const holdsKey = BOOKING_REDIS_KEYS.HOLDS(showtimeId);
    await client.hset(holdsKey, fields);
    // Hash tự xóa sau khi hết hạn giữ ghế + đệm 1 phút
    await client.expire(holdsKey, Math.ceil(ttlMs / 1000) + 60);

    return expiresAt;
  }

  async extend(
    showtimeId: string,
    seatIds: string[],
    userId: string,
    ttlMs: number,
  ): Promise<void> {
    if (seatIds.length === 0) return;

    // 1. Gia hạn khóa của chính user; khóa đã mất (Redis restart / hết TTL) thì lấy lại
    for (const seatId of seatIds) {
      const key = BOOKING_REDIS_KEYS.SEAT_LOCK(showtimeId, seatId);
      const ok =
        (await this.redisService.extendLock(key, userId, ttlMs)) ||
        (await this.redisService.acquireLock(key, userId, ttlMs));
      if (!ok) {
        this.logger.warn(
          `Không gia hạn được khóa ghế ${seatId} (suất ${showtimeId}) cho user ${userId}; DB vẫn giữ ghế cho đơn hàng.`,
        );
      }
    }

    // 2. Cập nhật hạn giữ hiển thị trên sơ đồ ghế
    const expiresAt = new Date(Date.now() + ttlMs);
    const payload = JSON.stringify({
      userId,
      expiresAt: expiresAt.toISOString(),
    });
    const fields: Record<string, string> = {};
    for (const seatId of seatIds) fields[seatId] = payload;

    const client = this.redisService.getClient();
    const holdsKey = BOOKING_REDIS_KEYS.HOLDS(showtimeId);
    await client.hset(holdsKey, fields);
    const neededTtlMs = ttlMs + 60_000;
    const currentTtlMs = await client.pttl(holdsKey);
    if (currentTtlMs < neededTtlMs) {
      await client.pexpire(holdsKey, neededTtlMs);
    }
  }

  async release(
    showtimeId: string,
    seatIds: string[],
    userId?: string,
  ): Promise<void> {
    if (seatIds.length === 0) return;

    if (userId) {
      await this.unlock(showtimeId, seatIds, userId);
    }
    await this.redisService
      .getClient()
      .hdel(BOOKING_REDIS_KEYS.HOLDS(showtimeId), ...seatIds);
  }

  /** Chỉ nhả khóa thuộc về `userId`. */
  private async unlock(
    showtimeId: string,
    seatIds: string[],
    userId: string,
  ): Promise<void> {
    await Promise.all(
      seatIds.map((seatId) =>
        this.redisService.releaseLock(
          BOOKING_REDIS_KEYS.SEAT_LOCK(showtimeId, seatId),
          userId,
        ),
      ),
    );
  }
}
