import { Order } from '../entities/order.entity.js';
import { OrderChannel } from '../enums/order-channel.enum.js';
import type { TransactionContext } from '../ports/transaction.port.js';

/** Dữ liệu để tạo đơn PENDING cùng chi tiết ghế/F&B (một aggregate). */
export interface NewOrderData {
  order: {
    orderCode: string;
    userId: string;
    showtimeId: string;
    channel: OrderChannel;
    subtotalTickets: number;
    subtotalFnb: number;
    discountAmount: number;
    finalAmount: number;
    expiresAt: Date;
  };
  seats: { seatId: string; price: number }[];
  fnbItems: {
    fnbItemId: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
}

export interface IOrderRepository {
  findById(id: string, tx?: TransactionContext): Promise<Order | null>;

  /** Kèm tickets, seatDetails, fnbDetails. */
  findByIdWithDetails(id: string): Promise<Order | null>;

  /** Kèm seatDetails. */
  findByIdWithSeatDetails(id: string): Promise<Order | null>;

  /** Đơn của user, mới nhất trước. */
  findByUser(userId: string, limit: number): Promise<Order[]>;

  /** Đơn PENDING đã quá hạn thanh toán. */
  findExpiredPending(now: Date): Promise<Order[]>;

  /** Danh sách seatId (đã loại trùng) của đơn. */
  findSeatIds(orderId: string): Promise<string[]>;

  /** Tạo Order (PENDING) + OrderSeatDetail + OrderFnbDetail (PENDING) trong transaction `tx`. */
  createPending(data: NewOrderData, tx: TransactionContext): Promise<Order>;

  save(order: Order, tx?: TransactionContext): Promise<Order>;

  /** Các chi tiết F&B còn PENDING của đơn -> CANCELLED. */
  cancelPendingFnbDetails(
    orderId: string,
    tx: TransactionContext,
  ): Promise<void>;
}

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');
