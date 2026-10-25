import { Order } from '../../domain/entities/order.entity.js';
import type { OrderSnapshot } from '../dto/order-snapshot.dto.js';

function toPricing(order: Order) {
  return {
    subtotalTickets: Number(order.subtotalTickets),
    subtotalFnb: Number(order.subtotalFnb),
    discountAmount: Number(order.discountAmount),
    finalAmount: Number(order.finalAmount),
  };
}

/** POST /orders */
export function toOrderCreatedResponse(order: Order, seatIds: string[]) {
  return {
    orderId: Number(order.id),
    orderCode: order.orderCode,
    showtimeId: Number(order.showtimeId),
    seatIds: seatIds.map(Number),
    channel: order.channel,
    pricing: toPricing(order),
    status: order.status,
    expiresAt: order.expiresAt,
    createdAt: order.createdAt,
  };
}

/** Phần tử trong GET /orders/my và phần đầu của GET /orders/:id */
export function toOrderListItem(order: Order) {
  return {
    orderId: Number(order.id),
    orderCode: order.orderCode,
    showtimeId: Number(order.showtimeId),
    channel: order.channel,
    paymentMethod: order.paymentMethod,
    pricing: toPricing(order),
    status: order.status,
    expiresAt: order.expiresAt,
    createdAt: order.createdAt,
  };
}

/** GET /orders/:id – order phải được load kèm tickets, seatDetails, fnbDetails */
export function toOrderDetail(order: Order) {
  return {
    ...toOrderListItem(order),
    seatIds: order.seatDetails.map((seat) => Number(seat.seatId)),
    tickets: order.tickets.map((ticket) => ({
      id: Number(ticket.id),
      ticketCode: ticket.ticketCode,
      seatId: Number(ticket.seatId),
      price: Number(ticket.price),
      status: ticket.status,
    })),
    fnbDetails: order.fnbDetails.map((detail) => ({
      id: Number(detail.id),
      fnbItemId: Number(detail.fnbItemId),
      quantity: detail.quantity,
      unitPrice: Number(detail.unitPrice),
      subtotal: Number(detail.subtotal),
      status: detail.status,
    })),
  };
}

/** POST /orders/:id/cancel */
export function toOrderCancelledResponse(order: Order, seatIds: string[]) {
  return {
    orderId: Number(order.id),
    orderCode: order.orderCode,
    status: order.status,
    releasedSeatIds: seatIds.map(Number),
    message: 'Hủy đơn hàng thành công',
  };
}

export function toOrderSnapshot(order: Order): OrderSnapshot {
  return {
    id: Number(order.id),
    orderCode: order.orderCode,
    userId: order.userId,
    showtimeId: Number(order.showtimeId),
    status: order.status,
    paymentMethod: order.paymentMethod,
    finalAmount: Number(order.finalAmount),
    expiresAt: order.expiresAt,
  };
}
