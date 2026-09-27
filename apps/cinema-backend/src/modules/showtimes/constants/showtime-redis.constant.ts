export const SHOWTIME_REDIS_KEYS = {
  /**
   * Key lưu danh sách suất chiếu theo filter/query.
   * Pattern format: cinema:showtimes:list:m={movie_id}:c={cineplex_id}:d={date}:pt={projection_type}:st={status}
   */
  LIST: (queryStr: string) => `cinema:showtimes:list:${queryStr}`,

  /**
   * Key lưu chi tiết suất chiếu theo ID.
   * Pattern format: cinema:showtimes:detail:{id}
   */
  DETAIL: (id: number | string) => `cinema:showtimes:detail:${id}`,

  /**
   * Key lưu bảng giá vé theo suất chiếu.
   * Pattern format: cinema:showtimes:prices:{id}
   */
  PRICES: (id: number | string) => `cinema:showtimes:prices:${id}`,

  /**
   * Redis Hash Key lưu trạng thái sơ đồ ghế realtime (Hold/Booked).
   * Pattern format: cinema:showtimes:{id}:seats:status
   */
  SEATS_STATUS: (id: number | string) => `cinema:showtimes:${id}:seats:status`,
  PATTERN_LIST: 'cinema:showtimes:list:*', // Pattern xóa cache danh sách suất chiếu khi có sự thay đổi
  PATTERN_PRICES: 'cinema:showtimes:prices:*', // Pattern xóa cache bảng giá vé khi PriceRule thay đổi
  PATTERN_ALL: 'cinema:showtimes:*', // Pattern xóa toàn bộ cache liên quan đến Showtimes
} as const;

export const SHOWTIME_REDIS_TTL = {
  LIST_SECONDS: 15 * 60, // TTL danh sách suất chiếu: 15 phút (900 seconds)
  DETAIL_SECONDS: 30 * 60, // TTL chi tiết suất chiếu: 30 phút (1800 seconds)
  PRICES_SECONDS: 30 * 60, // TTL bảng giá vé suất chiếu: 30 phút (1800 seconds)
  SEATS_HOLD_SECONDS: 10 * 30, // TTL giữ ghế tạm thời (Hold): 5 phút (300 seconds)
} as const;
