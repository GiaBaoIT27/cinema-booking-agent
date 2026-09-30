/**
 * Integration event: module `bookings` phát khi hết thời gian giữ ghế mà chưa thanh toán.
 * Cố ý chỉ có userId (bookings không nắm email/SĐT của khách).
 */
export interface BookingExpiredEventPayload {
  bookingId: string;
  userId: string;
  showtimeId: string;
  seatCodes: string[];
}
