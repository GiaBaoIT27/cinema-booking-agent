import { randomInt } from 'node:crypto';

/**
 * Đơn hàng PENDING hết hạn sau 10 phút nếu chưa thanh toán.
 * Thời gian giữ ghế bên module bookings (11 phút) PHẢI lớn hơn giá trị này.
 */
export const ORDER_EXPIRY_MINUTES = 10;

/** Quyền được xem vé của mọi khách hàng (không có quyền này chỉ thấy vé của chính mình). */
export const TICKET_VIEW_ALL_PERMISSION = 'ticket:view';

export function calculateExpiresAt(now: Date): Date {
  return new Date(now.getTime() + ORDER_EXPIRY_MINUTES * 60 * 1000);
}

export function calculateFinalAmount(
  subtotalTickets: number,
  subtotalFnb: number,
  discountAmount: number,
): number {
  return Math.max(0, subtotalTickets + subtotalFnb - discountAmount);
}

export function canViewAllTickets(permissions: string[] | undefined): boolean {
  return permissions?.includes(TICKET_VIEW_ALL_PERMISSION) ?? false;
}

const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function randomSuffix(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return result;
}

function compactDate(now: Date): string {
  return now.toISOString().slice(0, 10).replace(/-/g, '');
}

/** Mã đơn hàng dạng ORD-20260924-X7K2P9 */
export function generateOrderCode(now: Date = new Date()): string {
  return `ORD-${compactDate(now)}-${randomSuffix(6)}`;
}

/** Mã vé dạng TKT-20260924-X7K2P9 (ngẫu nhiên an toàn mật mã) */
export function generateTicketCode(now: Date = new Date()): string {
  return `TKT-${compactDate(now)}-${randomSuffix(6)}`;
}
