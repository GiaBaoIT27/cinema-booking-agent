/**
 * Tên các queue BullMQ dùng trong hệ thống.
 * Đặt tập trung ở đây để tránh hard-code string rải rác giữa Producer và Worker.
 */
export const QueueNames = {
  /** Xử lý timeout booking (hết TTL giữ ghế → chuyển EXPIRED, release ghế) */
  BOOKING_TIMEOUT: 'booking-timeout',

  /** Gửi email (welcome, ticket confirmation...) */
  MAIL: 'mail',

  NOTIFICATION: 'notification',

  /** Gửi thông báo đẩy (push notification) */
  PUSH_NOTIFICATION: 'push-notification',

  /** Nhắc khách hàng trước giờ chiếu */
  SHOWTIME_REMINDER: 'showtime-reminder',
} as const;

export type QueueName = (typeof QueueNames)[keyof typeof QueueNames];
