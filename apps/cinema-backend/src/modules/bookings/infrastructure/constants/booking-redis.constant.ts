export const BOOKING_REDIS_KEYS = {
  // Key khóa ghế theo suất chiếu và vị trí ghế
  SEAT_LOCK: (showtimeId: string, seatId: string) =>
    `cinema:booking:lock:showtime:${showtimeId}:seat:${seatId}`,
  /**
   * Hash trạng thái giữ ghế realtime (field = seatId, value = JSON { userId, expiresAt }).
   * CÙNG key mà module showtimes đọc trong GET /showtimes/:id/seats (getSeatMatrix)
   * — đổi key này thì sơ đồ ghế sẽ mất trạng thái HOLDING realtime.
   */
  HOLDS: (showtimeId: string) => `showtime:${showtimeId}:holds`,
};
