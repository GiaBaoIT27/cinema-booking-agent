import { randomInt } from 'node:crypto';

/**
 * Thời gian giữ ghế: 11 phút.
 * PHẢI LỚN HƠN thời hạn đơn hàng PENDING (10 phút, bên module orders) để ghế không bị nhả
 * khi đơn còn hạn thanh toán (dư 1 phút đệm cho bước dọn dẹp).
 */
export const SEAT_HOLD_DURATION_MS = 11 * 60 * 1000;

/**
 * Số ghế tối đa một người được giữ cùng lúc cho MỘT suất chiếu (kể cả ghế đã gắn đơn chờ
 * thanh toán). Chống chiếm toàn bộ ghế của suất chiếu bằng một tài khoản.
 */
export const MAX_SEATS_PER_USER_PER_SHOWTIME = 10;

/** Số ghế còn được giữ thêm, tính cả các ghế đang giữ của chính user (giữ lại không tính 2 lần). */
export function remainingHoldQuota(
  alreadyHeldSeatIds: string[],
  requestedSeatIds: string[],
): number {
  const held = new Set(alreadyHeldSeatIds);
  const newSeats = requestedSeatIds.filter((id) => !held.has(id)).length;
  return MAX_SEATS_PER_USER_PER_SHOWTIME - held.size - newSeats;
}

/** Trạng thái suất chiếu cho phép giữ ghế (từ vựng của module showtimes). */
const HOLDABLE_SHOWTIME_STATUSES: readonly string[] = ['OPEN', 'SCHEDULED'];

/** Trạng thái ghế vật lý được phép bán (từ vựng của module cinemas). */
const SELLABLE_SEAT_STATUS = 'ACTIVE';

export function isShowtimeHoldable(showtimeStatus: string): boolean {
  return HOLDABLE_SHOWTIME_STATUSES.includes(showtimeStatus);
}

export function isSeatSellable(seatStatus: string): boolean {
  return seatStatus === SELLABLE_SEAT_STATUS;
}

const TICKET_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** Mã vé dạng TKT-YYYYMMDD-XXXXXX (6 ký tự ngẫu nhiên an toàn mật mã). */
export function generateTicketCode(now: Date = new Date()): string {
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  let random = '';
  for (let i = 0; i < 6; i++) {
    random += TICKET_CODE_ALPHABET[randomInt(TICKET_CODE_ALPHABET.length)];
  }
  return `TKT-${dateStr}-${random}`;
}
