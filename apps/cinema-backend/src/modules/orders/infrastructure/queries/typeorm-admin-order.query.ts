import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type {
  AdminOrderDetail,
  AdminOrderFilter,
  AdminOrderPage,
  AdminOrderQueryPort,
  AdminOrderRow,
} from '../../application/ports/admin-order-query.port.js';

/**
 * Read model cho trang quản trị: một truy vấn SQL nối orders với users, showtimes, movies,
 * auditoriums, cineplexes để hiển thị danh sách (giống cách users.service đọc chéo module).
 * Chỉ đọc, không thay đổi trạng thái đơn.
 */
const BASE_FROM = `
  FROM orders o
  JOIN users u ON u.id = o.user_id
  JOIN showtimes s ON s.id = o.showtime_id
  JOIN movies m ON m.id = s.movie_id
  JOIN auditoriums a ON a.id = s.auditorium_id
  JOIN cineplexes c ON c.id = a.cineplex_id`;

const ROW_SELECT = `
  o.id AS order_id, o.order_code, o.status, o.channel, o.payment_method, o.final_amount, o.created_at,
  u.id AS user_id, u.full_name, u.email, u.phone_number,
  s.id AS showtime_id, s.start_time, m.title AS movie_title, a.name AS auditorium_name,
  c.id AS cineplex_id, c.name AS cineplex_name,
  (SELECT COUNT(*) FROM order_seat_details sd WHERE sd.order_id = o.id)::int AS seat_count`;

type Raw = Record<string, any>;

function toRow(r: Raw): AdminOrderRow {
  return {
    orderId: Number(r.order_id),
    orderCode: r.order_code,
    status: r.status,
    channel: r.channel,
    paymentMethod: r.payment_method ?? null,
    finalAmount: Number(r.final_amount),
    seatCount: Number(r.seat_count),
    createdAt: r.created_at,
    customer: {
      id: Number(r.user_id),
      fullName: r.full_name,
      email: r.email,
      phoneNumber: r.phone_number,
    },
    showtime: {
      id: Number(r.showtime_id),
      startTime: r.start_time,
      movieTitle: r.movie_title,
      auditoriumName: r.auditorium_name,
      cineplexId: Number(r.cineplex_id),
      cineplexName: r.cineplex_name,
    },
  };
}

@Injectable()
export class TypeOrmAdminOrderQuery implements AdminOrderQueryPort {
  constructor(private readonly dataSource: DataSource) {}

  async search(filter: AdminOrderFilter): Promise<AdminOrderPage> {
    const where: string[] = [];
    const params: unknown[] = [];
    const add = (sql: string, value: unknown) => {
      params.push(value);
      where.push(sql.replace('?', `$${params.length}`));
    };

    if (filter.status) add('o.status = ?', filter.status);
    if (filter.cineplexId) add('c.id = ?', filter.cineplexId);
    if (filter.date) add(`(o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = ?::date`, filter.date);
    if (filter.keyword) {
      params.push(`%${filter.keyword.trim()}%`);
      const p = `$${params.length}`;
      where.push(`(o.order_code ILIKE ${p} OR u.email ILIKE ${p} OR u.phone_number ILIKE ${p})`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [agg] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE o.status = 'PAID')::int AS paid_count,
              COALESCE(SUM(o.final_amount) FILTER (WHERE o.status = 'PAID'), 0) AS paid_revenue
       ${BASE_FROM} ${whereSql}`,
      params,
    );

    const offset = (filter.page - 1) * filter.limit;
    const rows: Raw[] = await this.dataSource.query(
      `SELECT ${ROW_SELECT} ${BASE_FROM} ${whereSql}
       ORDER BY o.created_at DESC, o.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, filter.limit, offset],
    );

    return {
      items: rows.map(toRow),
      total: Number(agg?.total ?? 0),
      summary: {
        paidCount: Number(agg?.paid_count ?? 0),
        paidRevenue: Number(agg?.paid_revenue ?? 0),
      },
    };
  }

  async findDetail(orderId: string): Promise<AdminOrderDetail | null> {
    const [r]: Raw[] = await this.dataSource.query(
      `SELECT ${ROW_SELECT}, o.subtotal_tickets, o.subtotal_fnb, o.discount_amount, o.paid_txn_ref, o.expires_at
       ${BASE_FROM} WHERE o.id = $1`,
      [orderId],
    );
    if (!r) return null;

    const seats: Raw[] = await this.dataSource.query(
      `SELECT se.row_label, se.seat_number, sd.price, t.ticket_code, t.status AS ticket_status
       FROM order_seat_details sd
       JOIN seats se ON se.id = sd.seat_id
       LEFT JOIN tickets t ON t.order_id = sd.order_id AND t.seat_id = sd.seat_id
       WHERE sd.order_id = $1
       ORDER BY se.row_label, se.seat_number`,
      [orderId],
    );
    const fnb: Raw[] = await this.dataSource.query(
      `SELECT f.name, fd.quantity, fd.unit_price, fd.subtotal, fd.status
       FROM order_fnb_details fd JOIN fnb_items f ON f.id = fd.fnb_item_id
       WHERE fd.order_id = $1 ORDER BY fd.id`,
      [orderId],
    );

    return {
      ...toRow(r),
      subtotalTickets: Number(r.subtotal_tickets),
      subtotalFnb: Number(r.subtotal_fnb),
      discountAmount: Number(r.discount_amount),
      paidTxnRef: r.paid_txn_ref ?? null,
      expiresAt: r.expires_at ?? null,
      seats: seats.map((s) => ({
        // seat_number đã gồm hàng (vd "A1")
        seatLabel: String(s.seat_number),
        price: Number(s.price),
        ticketCode: s.ticket_code ?? null,
        ticketStatus: s.ticket_status ?? null,
      })),
      fnbItems: fnb.map((f) => ({
        name: f.name,
        quantity: Number(f.quantity),
        unitPrice: Number(f.unit_price),
        subtotal: Number(f.subtotal),
        status: f.status,
      })),
    };
  }
}
