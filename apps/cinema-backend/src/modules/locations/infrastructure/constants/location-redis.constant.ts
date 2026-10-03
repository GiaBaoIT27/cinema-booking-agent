export const LOCATION_REDIS_KEYS = {
  PROVINCES_LIST: (queryStr: string) =>
    `cinema:locations:provinces:list:${queryStr}`,
  WARDS_LIST: (queryStr: string) => `cinema:locations:wards:list:${queryStr}`,
  PROVINCE_BY_ID: (id: number | string) => `cinema:locations:province:${id}`,
  WARD_BY_ID: (id: number | string) => `cinema:locations:ward:${id}`,
  PATTERN_ALL: 'cinema:locations:*',
};

export const LOCATION_CACHE_TTL = 24 * 60 * 60; // 24 giờ (tính bằng giây)
