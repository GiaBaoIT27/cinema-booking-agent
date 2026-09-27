import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '#src/common/redis/redis.service.js';
import {
  BOOKING_REDIS_KEYS,
  DEFAULT_SEAT_LOCK_TTL_MS,
} from '../constants/booking-redis.constant.js';

@Injectable()
export class SeatLockService {
  private readonly logger = new Logger(SeatLockService.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * Giữ/Khóa danh sách nhiều ghế cùng lúc.
   * Nếu 1 ghế trong danh sách bị trùng (đã bị giữ), tự động Rollback hoàn trả các ghế đã khóa trước đó.
   */
  async lockSeats(
    showtimeId: string,
    seatIds: string[],
    userId: string,
    ttlMs: number = DEFAULT_SEAT_LOCK_TTL_MS,
  ): Promise<boolean> {
    const acquiredSeatIds: string[] = [];

    for (const seatId of seatIds) {
      const lockKey = BOOKING_REDIS_KEYS.SEAT_LOCK(showtimeId, seatId);
      const acquired = await this.redisService.acquireLock(
        lockKey,
        userId,
        ttlMs,
      );

      if (acquired) {
        acquiredSeatIds.push(seatId);
      } else {
        // Tự động Rollback giải phóng các ghế lỡ khóa thành công trước đó
        this.logger.warn(
          `Khóa ghế ${seatId} thất bại cho suất chiếu ${showtimeId}. Đang rollback các ghế: [${acquiredSeatIds.join(', ')}]`,
        );
        await this.unlockSeats(showtimeId, acquiredSeatIds, userId);
        return false;
      }
    }

    return true;
  }

  // Giải phóng danh sách ghế an toàn (chỉ giải phóng ghế thuộc về userId chỉ định)
  async unlockSeats(
    showtimeId: string,
    seatIds: string[],
    userId: string,
  ): Promise<void> {
    const unlockPromises = seatIds.map((seatId) => {
      const lockKey = BOOKING_REDIS_KEYS.SEAT_LOCK(showtimeId, seatId);
      return this.redisService.releaseLock(lockKey, userId);
    });

    await Promise.all(unlockPromises);
  }

  // Kiểm tra xem một ghế cụ thể có đang bị khóa hay không
  async isSeatLocked(showtimeId: string, seatId: string): Promise<boolean> {
    const lockKey = BOOKING_REDIS_KEYS.SEAT_LOCK(showtimeId, seatId);
    return this.redisService.exists(lockKey);
  }

  // Lấy ID người dùng hiện đang giữ ghế
  async getSeatLockOwner(
    showtimeId: string,
    seatId: string,
  ): Promise<string | null> {
    const lockKey = BOOKING_REDIS_KEYS.SEAT_LOCK(showtimeId, seatId);
    return this.redisService.get(lockKey);
  }
}
