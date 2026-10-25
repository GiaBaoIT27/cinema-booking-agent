import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkState, allPass, seatRef, expectedTicketTotal, type Fixtures, type Snapshot } from './eval-expect.js';

const fx: Fixtures = {
  users: [{ key: 'user1', id: '11' }, { key: 'user2', id: '12' }],
  showtimes: [{ key: 'mai-evening', id: '100', auditoriumCode: 'H1' }],
  seatsByAuditorium: { H1: { NORMAL: [{ id: '1', seatNumber: 'A1' }, { id: '2', seatNumber: 'A2' }], VIP: [{ id: '50', seatNumber: 'D5' }] } },
  prices: { 'mai-evening': { NORMAL: 100000, VIP: 130000 } },
};
const now = new Date('2026-11-20T12:00:00Z');
const future = new Date(now.getTime() + 300_000).toISOString();
const past = new Date(now.getTime() - 300_000).toISOString();
const snap = (seats: Snapshot['seats'], orders: Snapshot['orders'] = []): Snapshot => ({ takenAt: now.toISOString(), seats, orders });

test('holding đúng user, còn hạn', () => {
  const r = checkState(snap([{ showtime_id: '100', seat_id: '1', status: 'HOLDING', user_id: '11', hold_expires_at: future }]), fx,
    [{ kind: 'holding', showtime: 'mai-evening', user: 'user1', seatIds: ['1'], exact: true }]);
  assert.ok(allPass(r));
});
test('hold hết hạn không tính là đang giữ', () => {
  const s = snap([{ showtime_id: '100', seat_id: '1', status: 'HOLDING', user_id: '11', hold_expires_at: past }]);
  assert.ok(!allPass(checkState(s, fx, [{ kind: 'holding', showtime: 'mai-evening', user: 'user1', seatIds: ['1'] }])));
  assert.ok(allPass(checkState(s, fx, [{ kind: 'noHolding', user: 'user1' }, { kind: 'seatAvailable', showtime: 'mai-evening', seatIds: ['1'] }])));
});
test('exact phát hiện ghế thừa; ghế của user khác không tính', () => {
  const s = snap([
    { showtime_id: '100', seat_id: '1', status: 'HOLDING', user_id: '11', hold_expires_at: future },
    { showtime_id: '100', seat_id: '2', status: 'HOLDING', user_id: '11', hold_expires_at: future },
    { showtime_id: '100', seat_id: '50', status: 'HOLDING', user_id: '12', hold_expires_at: future },
  ]);
  assert.ok(!allPass(checkState(s, fx, [{ kind: 'holding', showtime: 'mai-evening', user: 'user1', seatIds: ['1'], exact: true }])));
  assert.ok(allPass(checkState(s, fx, [{ kind: 'holding', showtime: 'mai-evening', user: 'user1', seatIds: ['1', '2'], exact: true }])));
  assert.ok(!allPass(checkState(s, fx, [{ kind: 'seatAvailable', showtime: 'mai-evening', seatIds: ['50'] }])));
});
test('orders: đếm, trạng thái, tổng tiền', () => {
  const o = { id: '9', order_code: 'ORD9', user_id: '11', showtime_id: '100', status: 'PENDING' as const, subtotal_tickets: '230000.00',
    subtotal_fnb: '0', discount_amount: '0', final_amount: '230000.00', expires_at: future, seat_count: '2', fnb_qty: '0', ticket_count: '0' };
  const total = expectedTicketTotal(fx, 'mai-evening', ['NORMAL', 'VIP']);
  assert.equal(total, 230000);
  assert.ok(allPass(checkState(snap([], [o]), fx, [{ kind: 'orders', user: 'user1', count: 1, status: 'PENDING', seatCount: 2, finalAmount: total }])));
  assert.ok(!allPass(checkState(snap([], [o]), fx, [{ kind: 'orders', user: 'user1', count: 0 }])));
});
test('seatRef lấy đúng ghế', () => {
  assert.equal(seatRef(fx, 'mai-evening', 'VIP').seatNumber, 'D5');
});
