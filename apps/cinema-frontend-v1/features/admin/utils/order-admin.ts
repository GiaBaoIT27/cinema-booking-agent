export type OrderStatusType = "PENDING" | "PAID" | "EXPIRED" | "CANCELLED" | "REFUNDED";

export const ORDER_STATUS_LABEL: Record<OrderStatusType, string> = {
  PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  EXPIRED: "Hết hạn",
  CANCELLED: "Đã hủy",
  REFUNDED: "Đã hoàn tiền",
};

export const ORDER_STATUS_TONE: Record<OrderStatusType, "amber" | "green" | "gray" | "red" | "blue"> = {
  PENDING: "amber",
  PAID: "green",
  EXPIRED: "gray",
  CANCELLED: "red",
  REFUNDED: "blue",
};

export const CHANNEL_LABEL: Record<string, string> = {
  ONLINE_WEB: "Web",
  ONLINE_APP: "App",
  POS_COUNTER: "Quầy",
};

export interface AdminOrderRow {
  orderId: number;
  orderCode: string;
  status: string;
  channel: string;
  paymentMethod: string | null;
  finalAmount: number;
  seatCount: number;
  createdAt: string;
  customer: { id: number; fullName: string; email: string; phoneNumber: string };
  showtime: {
    id: number;
    startTime: string;
    movieTitle: string;
    auditoriumName: string;
    cineplexId: number;
    cineplexName: string;
  };
}

export interface AdminOrderDetail extends AdminOrderRow {
  subtotalTickets: number;
  subtotalFnb: number;
  discountAmount: number;
  paidTxnRef: string | null;
  expiresAt: string | null;
  seats: { seatLabel: string; price: number; ticketCode: string | null; ticketStatus: string | null }[];
  fnbItems: { name: string; quantity: number; unitPrice: number; subtotal: number; status: string }[];
}

export interface OrderSummary {
  paidCount: number;
  paidRevenue: number;
}
