export const AUDITORIUM_REDIS_KEYS = {
  LIST: (queryStr: string) => `cinema:auditoriums:list:${queryStr}`,
  DETAIL: (id: string | number) => `cinema:auditoriums:detail:${id}`,
  SEATS: (id: string | number) => `cinema:auditoriums:${id}:seats`,
  PATTERN_ALL: 'cinema:auditoriums:*',
  // Danh sách phòng theo cụm rạp được cache trong namespace của cụm rạp
  PATTERN_CINEPLEXES: 'cinema:cineplexes:*',
};

export const AUDITORIUM_CACHE_TTL = 6 * 60 * 60; // 6 giờ tính bằng giây
export const SEATS_CACHE_TTL = 12 * 60 * 60; // 12 giờ tính bằng giây
