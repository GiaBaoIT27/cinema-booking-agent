export const BOOKING_REDIS_KEYS = {
  // Key khóa ghế theo suất chiếu và vị trí ghế
  SEAT_LOCK: (showtimeId: string, seatId: string) =>
    `cinema:booking:lock:showtime:${showtimeId}:seat:${seatId}`,
};

// Thời gian giữ ghế mặc định: 11 phút (660,000 ms)
// LƯU Ý: Phải LỚN HƠN thời hạn đơn hàng PENDING (10 phút - ORDER_EXPIRY_MINUTES bên booking.service)
// để ghế không bị nhả trong khi đơn vẫn còn hạn thanh toán (dư 1 phút buffer cho cleanup)
export const DEFAULT_SEAT_LOCK_TTL_MS = 11 * 60 * 1000;
