export const CINEPLEX_REDIS_KEYS = {
  LIST: (queryStr: string) => `cinema:cineplexes:list:${queryStr}`,
  DETAIL: (id: number | string) => `cinema:cineplexes:id:${id}`,
  AUDITORIUMS: (id: number | string, status: string) =>
    `cinema:cineplexes:${id}:auditoriums:st=${status}`,
  SHOWTIMES: (id: number | string, date: string, movieId: number | string) =>
    `cinema:cineplexes:${id}:showtimes:d=${date}:m=${movieId}`,
  FNB_ITEMS: (id: number | string, category: string) =>
    `cinema:cineplexes:${id}:fnb-items:cat=${category}`,
  PATTERN_ALL: 'cinema:cineplexes:*',
  PATTERN_SHOWTIMES: 'cinema:showtimes:*',
};

export const CINEPLEX_CACHE_TTL = 6 * 60 * 60; // 6 giờ tính bằng giây
export const CINEPLEX_FNB_CACHE_TTL = 2 * 60 * 60; // 2 giờ tính bằng giây
