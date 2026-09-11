export const GENRE_REDIS_KEYS = {
  LIST: (queryStr: string) => `cinema:genres:list:${queryStr}`,
  DETAIL: (id: number | string) => `cinema:genres:detail:${id}`,
  MOVIES: (id: number | string, queryStr: string) =>
    `cinema:genres:${id}:movies:${queryStr}`,
  PATTERN_ALL: 'cinema:genres:*',
};

export const GENRE_CACHE_TTL = 24 * 60 * 60; // 24 giờ tính bằng giây
