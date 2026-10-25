export type OrderChannel = "ONLINE_APP" | "ONLINE_WEB" | "POS_COUNTER";
export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "EXPIRED"
  | "CANCELLED"
  | "REFUNDED";

export interface OrderFnbItemPayload {
  fnbItemId: number;
  quantity: number;
}

/** Body của POST /orders */
export interface CreateOrderPayload {
  showtimeId: number;
  seatIds: number[];
  fnbItems?: OrderFnbItemPayload[];
  voucherCode?: string;
  channel: OrderChannel;
}

export interface OrderPricing {
  subtotalTickets: number;
  subtotalFnb: number;
  discountAmount: number;
  finalAmount: number;
}

/** POST /orders */
export interface OrderCreated {
  orderId: number;
  orderCode: string;
  showtimeId: number;
  seatIds: number[];
  channel: OrderChannel;
  pricing: OrderPricing;
  status: OrderStatus;
  expiresAt: string;
  createdAt: string;
}

export interface OrderTicket {
  id: number;
  ticketCode: string;
  seatId: number;
  price: number;
  status: string;
}

export interface OrderFnbDetail {
  id: number;
  fnbItemId: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  status: string;
}

/** GET /orders/:id */
export interface OrderDetail {
  orderId: number;
  orderCode: string;
  showtimeId: number;
  channel: OrderChannel;
  paymentMethod: string | null;
  pricing: OrderPricing;
  status: OrderStatus;
  expiresAt: string;
  createdAt: string;
  seatIds: number[];
  tickets: OrderTicket[];
  fnbDetails: OrderFnbDetail[];
}

/** POST /orders/:id/cancel */
export interface OrderCancelled {
  orderId: number;
  orderCode: string;
  status: OrderStatus;
  releasedSeatIds: number[];
  message: string;
}

/** Phần tử của GET /orders/my */
export interface OrderListItem {
  orderId: number;
  orderCode: string;
  showtimeId: number;
  channel: OrderChannel;
  paymentMethod: string | null;
  pricing: OrderPricing;
  status: OrderStatus;
  expiresAt: string;
  createdAt: string;
}
