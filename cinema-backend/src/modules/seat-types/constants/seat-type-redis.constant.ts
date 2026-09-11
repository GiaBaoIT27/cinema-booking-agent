// src/modules/seat-types/constants/seat-type-redis.constant.ts
export const SEAT_TYPE_REDIS_KEYS = {
  ALL: 'cinema:seat-types:all',
  DETAIL: (id: number | string) => `cinema:seat-types:${id}`,
};

export const SEAT_TYPE_CACHE_TTL = 24 * 60 * 60; // 24 giờ (tính bằng giây)
