import { Injectable } from '@nestjs/common';
import { RedisService } from '#src/core/redis/redis.service.js';
import { AUTH_REDIS_KEYS } from '../../infrastructure/auth-redis.constant.js';

@Injectable()
export class TokenRevocationService {
  constructor(private readonly redisService: RedisService) {}

  async blacklistToken(jti: string, expHeaderSeconds: number): Promise<void> {
    const ttl = expHeaderSeconds - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await this.redisService.set(
        AUTH_REDIS_KEYS.TOKEN_BLACKLIST(jti),
        '1',
        ttl,
      );
    }
  }

  async isBlacklisted(jti: string): Promise<boolean> {
    return this.redisService.exists(AUTH_REDIS_KEYS.TOKEN_BLACKLIST(jti));
  }

  async revokeAllUserTokens(
    userId: string,
    maxTokenLifetimeSec = 604800,
  ): Promise<void> {
    // Đặt TTL bằng thời hạn sống tối đa của Refresh Token (7 ngày) để tự dọn dẹp RAM
    await this.redisService.set(
      AUTH_REDIS_KEYS.USER_REVOCATION(userId),
      Date.now().toString(),
      maxTokenLifetimeSec,
    );
  }
}
