/**
 * Chấm điểm theo TRẠNG THÁI DB (không phụ thuộc lời văn của agent).
 * Không import entity/enum của backend để chạy được cả như script độc lập.
 * Giá trị trạng thái khớp enum backend:
 *   showtime_seats.status: AVAILABLE | HOLDING | BOOKED
 *   orders.status:         PENDING | PAID | EXPIRED | CANCELLED | REFUNDED
 *   payments.status:       INITIATED | SUCCESS | FAILED | REFUNDED
 *   tickets.status:        VALID | CHECKED_IN | CANCELLED
 * Quy ước: không có hàng trong showtime_seats = ghế AVAILABLE.
 */

export interface SeatRow {
  showtime_id: string | number;
  seat_id: string | number;
  status: 'AVAILABLE' | 'HOLDING' | 'BOOKED';
  user_id: string | number | null;
  hold_expires_at: string | Date | null;
}
export interface OrderRow {
  id: string | number;
  order_code: string;
  user_id: string | number;
  showtime_id: string | number;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';
  subtotal_tickets: string | number;
  subtotal_fnb: string | number;
  discount_amount: string | number;
  final_amount: string | number;
  expires_at: string | Date;
  seat_count: string | number;
  fnb_qty: string | number;
  ticket_count: string | number;
}
export interface Snapshot {
  takenAt: string;
  seats: SeatRow[];
  orders: OrderRow[];
}
export interface Fixtures {
  users: { key: string; id: string }[];
  showtimes: { key: string; id: string; auditoriumCode: string }[];
  seatsByAuditorium: Record<string, Record<string, { id: string; seatNumber: string }[]>>;
  prices: Record<string, Record<string, number>>;
}

export type StateExpect =
  /** Các ghế này đang được giữ (còn hạn) bởi đúng user. exact=true: user không giữ ghế nào khác trong suất đó. */
  | { kind: 'holding'; showtime: string; user: string; seatIds: string[]; exact?: boolean }
  /** User không giữ ghế nào còn hạn (ở mọi suất). */
  | { kind: 'noHolding'; user: string }
  /** Các ghế này trống (không có hàng, hoặc AVAILABLE, hoặc HOLDING đã hết hạn). */
  | { kind: 'seatAvailable'; showtime: string; seatIds: string[] }
  /** Số đơn của user, tuỳ chọn lọc theo trạng thái / suất, kèm kiểm tra chi tiết. */
  | {
      kind: 'orders';
      user: string;
      count: number;
      status?: OrderRow['status'];
      showtime?: string;
      seatCount?: number;
      fnbQty?: number;
      finalAmount?: number;
      discountAmount?: number;
    };

export interface Check {
  name: string;
  pass: boolean;
  detail: string;
}

const s = (v: string | number) => String(v);
const num = (v: string | number) => Number(v);

export function resolveUser(fx: Fixtures, key: string): string {
  const u = fx.users.find((x) => x.key === key);
  if (!u) throw new Error(`Không có user "${key}" trong fixtures`);
  return u.id;
}
export function resolveShowtime(fx: Fixtures, key: string): string {
  const st = fx.showtimes.find((x) => x.key === key);
  if (!st) throw new Error(`Không có suất "${key}" trong fixtures`);
  return st.id;
}
/** Lấy ghế theo phòng/loại/thứ tự: seatRef(fx,'mai-evening','VIP',0) */
export function seatRef(fx: Fixtures, showtimeKey: string, type: 'NORMAL' | 'VIP' | 'SWEETBOX', index = 0) {
  const st = fx.showtimes.find((x) => x.key === showtimeKey);
  const seat = st && fx.seatsByAuditorium[st.auditoriumCode]?.[type]?.[index];
  if (!seat) throw new Error(`Không có ghế ${type}[${index}] cho suất ${showtimeKey}`);
  return seat;
}
/** Tổng tiền vé kỳ vọng từ bảng giá đã seed (chưa gồm F&B, voucher). */
export function expectedTicketTotal(fx: Fixtures, showtimeKey: string, types: string[]): number {
  const p = fx.prices[showtimeKey];
  return types.reduce((sum, t) => {
    if (p?.[t] === undefined) throw new Error(`Thiếu giá ${t} cho suất ${showtimeKey}`);
    return sum + p[t];
  }, 0);
}

function activeHold(r: SeatRow, now: number): boolean {
  return r.status === 'HOLDING' && !!r.hold_expires_at && new Date(r.hold_expires_at).getTime() > now;
}

export function checkState(snap: Snapshot, fx: Fixtures, expects: StateExpect[]): Check[] {
  const now = new Date(snap.takenAt).getTime();
  const out: Check[] = [];

  for (const e of expects) {
    if (e.kind === 'holding') {
      const uid = resolveUser(fx, e.user);
      const stId = resolveShowtime(fx, e.showtime);
      const mine = snap.seats.filter((r) => s(r.showtime_id) === stId && s(r.user_id ?? '') === uid && activeHold(r, now));
      const have = new Set(mine.map((r) => s(r.seat_id)));
      const missing = e.seatIds.filter((id) => !have.has(id));
      const extra = [...have].filter((id) => !e.seatIds.includes(id));
      const pass = missing.length === 0 && (!e.exact || extra.length === 0);
      out.push({
        name: `holding ${e.user}@${e.showtime}`,
        pass,
        detail: pass ? `giữ ${have.size} ghế` : `thiếu [${missing}] thừa [${e.exact ? extra : '-'}]`,
      });
    } else if (e.kind === 'noHolding') {
      const uid = resolveUser(fx, e.user);
      const held = snap.seats.filter((r) => s(r.user_id ?? '') === uid && activeHold(r, now));
      out.push({
        name: `noHolding ${e.user}`,
        pass: held.length === 0,
        detail: held.length ? `còn giữ ghế [${held.map((r) => `${r.showtime_id}:${r.seat_id}`)}]` : 'không giữ ghế nào',
      });
    } else if (e.kind === 'seatAvailable') {
      const stId = resolveShowtime(fx, e.showtime);
      const bad = e.seatIds.filter((id) => {
        const row = snap.seats.find((r) => s(r.showtime_id) === stId && s(r.seat_id) === id);
        return !!row && (row.status === 'BOOKED' || activeHold(row, now));
      });
      out.push({
        name: `seatAvailable ${e.showtime}`,
        pass: bad.length === 0,
        detail: bad.length ? `ghế không trống [${bad}]` : 'tất cả trống',
      });
    } else {
      const uid = resolveUser(fx, e.user);
      let rows = snap.orders.filter((o) => s(o.user_id) === uid);
      if (e.status) rows = rows.filter((o) => o.status === e.status);
      if (e.showtime) rows = rows.filter((o) => s(o.showtime_id) === resolveShowtime(fx, e.showtime!));
      const problems: string[] = [];
      if (rows.length !== e.count) problems.push(`số đơn ${rows.length} ≠ ${e.count}`);
      const o = rows[0];
      if (o && e.count > 0) {
        if (e.seatCount !== undefined && num(o.seat_count) !== e.seatCount) problems.push(`số ghế ${o.seat_count} ≠ ${e.seatCount}`);
        if (e.fnbQty !== undefined && num(o.fnb_qty) !== e.fnbQty) problems.push(`số F&B ${o.fnb_qty} ≠ ${e.fnbQty}`);
        if (e.finalAmount !== undefined && num(o.final_amount) !== e.finalAmount) problems.push(`tổng ${o.final_amount} ≠ ${e.finalAmount}`);
        if (e.discountAmount !== undefined && num(o.discount_amount) !== e.discountAmount) problems.push(`giảm ${o.discount_amount} ≠ ${e.discountAmount}`);
      }
      out.push({
        name: `orders ${e.user}${e.status ? ' ' + e.status : ''}`,
        pass: problems.length === 0,
        detail: problems.length ? problems.join('; ') : `${rows.length} đơn đúng`,
      });
    }
  }
  return out;
}

export const allPass = (checks: Check[]) => checks.every((c) => c.pass);
