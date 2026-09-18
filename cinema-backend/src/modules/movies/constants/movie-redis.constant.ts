export const MOVIE_REDIS_KEYS = {
  // Key lưu danh sách phim theo filter/pagination. Pattern format: cinema:movies:list:{queryStr}
  LIST: (queryStr: string) => `cinema:movies:list:${queryStr}`,
  // Key lưu chi tiết phim theo ID. Pattern format: cinema:movies:detail:{id}
  DETAIL: (id: number | string) => `cinema:movies:detail:${id}`,
  // Pattern dùng cho chiến lược Invalidation (xóa cache khi có Mutation POST/PUT/PATCH/DELETE)
  PATTERN_ALL: 'cinema:movies:*',
} as const;

export const MOVIE_REDIS_TTL = {
  // TTL danh sách phim: 30 phút (1800 seconds)
  LIST_SECONDS: 30 * 60,
  // TTL chi tiết phim: 2 giờ (7200 seconds)
  DETAIL_SECONDS: 2 * 60 * 60,
} as const;
