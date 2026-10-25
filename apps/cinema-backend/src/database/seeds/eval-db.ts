import { DataSource } from 'typeorm';
import { readFileSync } from 'node:fs';

export interface EvalFixtures {
  users: { key: string; id: string; email: string }[];
  showtimes: { key: string; id: string }[];
  [k: string]: unknown;
}

export function loadFixtures(): EvalFixtures {
  const file = process.env.EVAL_FIXTURES ?? './eval-fixtures.json';
  return JSON.parse(readFileSync(file, 'utf8')) as EvalFixtures;
}

/**
 * Đưa dữ liệu giao dịch của 2 khách eval và các suất eval về trạng thái sạch.
 * Chỉ động tới: đơn/vé/thanh toán của user eval, và hàng showtime_seats của suất eval.
 */
export async function resetEvalState(
  ds: DataSource,
  fx: EvalFixtures,
): Promise<void> {
  const userIds = fx.users.map((u) => u.id);
  const showtimeIds = fx.showtimes.map((s) => s.id);
  await ds.transaction(async (m) => {
    const orderIds = `(SELECT id FROM orders WHERE user_id = ANY($1::bigint[]) OR showtime_id = ANY($2::bigint[]))`;
    const p = [userIds, showtimeIds];
    await m.query(`DELETE FROM tickets WHERE order_id IN ${orderIds}`, p);
    await m.query(
      `DELETE FROM order_seat_details WHERE order_id IN ${orderIds}`,
      p,
    );
    await m.query(
      `DELETE FROM order_fnb_details WHERE order_id IN ${orderIds}`,
      p,
    );
    await m.query(
      `DELETE FROM payment_transactions WHERE order_id IN ${orderIds}`,
      p,
    );
    await m.query(`DELETE FROM payments WHERE order_id IN ${orderIds}`, p);
    await m.query(
      `DELETE FROM orders WHERE user_id = ANY($1::bigint[]) OR showtime_id = ANY($2::bigint[])`,
      p,
    );
    await m.query(
      `DELETE FROM showtime_seats WHERE showtime_id = ANY($1::bigint[]) OR user_id = ANY($2::bigint[])`,
      [showtimeIds, userIds],
    );
  });
}

/** Ảnh chụp trạng thái để evaluator so với kỳ vọng. Giá trị status trả về nguyên văn từ DB. */
export async function takeSnapshot(ds: DataSource, fx: EvalFixtures) {
  const userIds = fx.users.map((u) => u.id);
  const showtimeIds = fx.showtimes.map((s) => s.id);
  const seats = await ds.query(
    `SELECT showtime_id, seat_id, status, user_id, hold_expires_at
       FROM showtime_seats
      WHERE showtime_id = ANY($1::bigint[]) OR user_id = ANY($2::bigint[])
      ORDER BY showtime_id, seat_id`,
    [showtimeIds, userIds],
  );
  const orders = await ds.query(
    `SELECT o.id, o.order_code, o.user_id, o.showtime_id, o.status,
            o.subtotal_tickets, o.subtotal_fnb, o.discount_amount, o.final_amount, o.expires_at,
            (SELECT count(*) FROM order_seat_details d WHERE d.order_id = o.id) AS seat_count,
            (SELECT coalesce(sum(f.quantity),0) FROM order_fnb_details f WHERE f.order_id = o.id) AS fnb_qty,
            (SELECT count(*) FROM tickets t WHERE t.order_id = o.id) AS ticket_count
       FROM orders o
      WHERE o.user_id = ANY($1::bigint[])
      ORDER BY o.id`,
    [userIds],
  );
  return { takenAt: new Date().toISOString(), seats, orders };
}
