export const FNB_REDIS_KEYS = {
  LIST: (queryStr: string) => `cinema:fnb:list:${queryStr}`,
  DETAIL: (id: number | string) => `cinema:fnb:detail:${id}`,
  PATTERN_ALL: 'cinema:fnb:*',
};

export const FNB_CACHE_TTL = 12 * 60 * 60; // 12 giờ tính bằng giây
