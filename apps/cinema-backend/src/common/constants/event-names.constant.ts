/**
 * Registry tên event toàn hệ thống.
 * Convention: '<module>.<entity>.<action>' (lowercase snake)
 *
 * Lưu ý: Giá trị string này được dùng làm EventEmitter2 topic.
 * Khi đổi tên phải grep cả codebase để cập nhật listener tương ứng.
 */
export const EventNames = {
  // ─── AUTH ────────────────────────────────────────────────
  AUTH_USER_BLOCKED: 'auth.user.blocked',

  // ─── USERS ───────────────────────────────────────────────
  USER_REGISTERED: 'user.registered',
  USER_BLOCKED: 'user.blocked',

  // ─── RBAC ────────────────────────────────────────────────
  RBAC_ROLE_PERMISSIONS_CHANGED: 'rbac.role.permissions_changed',

  // ─── SHOWTIME ────────────────────────────────────────────
  SHOWTIME_CREATED: 'showtime.created',
  SHOWTIME_CANCELLED: 'showtime.cancelled',

  // ─── BOOKING ─────────────────────────────────────────────
  BOOKING_SEATS_HELD: 'booking.seats.held',
  BOOKING_SEATS_RELEASED: 'booking.seats.released',
  BOOKING_CONFIRMED: 'booking.confirmed',
  BOOKING_EXPIRED: 'booking.expired',

  // ─── ORDER ───────────────────────────────────────────────
  ORDER_CREATED: 'order.created',
  ORDER_PAID: 'order.paid',
  ORDER_CANCELLED: 'order.cancelled',

  // ─── PAYMENT ─────────────────────────────────────────────
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
} as const;

export type EventName = (typeof EventNames)[keyof typeof EventNames];
