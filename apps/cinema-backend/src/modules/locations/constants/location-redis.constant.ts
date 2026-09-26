export const LOCATION_REDIS_KEYS = {
  PROVINCES_LIST: (queryStr: string) =>
    `cinema:locations:provinces:list:${queryStr}`,
  PROVINCE_WARDS: (provinceId: number | string, queryStr: string) =>
    `cinema:locations:provinces:${provinceId}:wards:${queryStr}`,
  WARDS_LIST: (queryStr: string) => `cinema:locations:wards:list:${queryStr}`,
  PATTERN_ALL: 'cinema:locations:*',
};

export const LOCATION_CACHE_TTL = 24 * 60 * 60; // 24 giờ (tính bằng giây)
