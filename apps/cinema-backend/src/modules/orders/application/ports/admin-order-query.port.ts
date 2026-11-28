import type { OrderStatus } from '../../domain/enums/order-status.enum.js';

/** Bộ lọc danh sách đơn cho trang quản trị (read model, không đi qua aggregate Order). */
export interface AdminOrderFilter {
  status?: OrderStatus;
  /** Mã đơn, email hoặc SĐT khách */
  keyword?: string;
  /** Lọc theo cụm rạp của suất chiếu; đã được áp phạm vi theo người gọi */
  cineplexId?: string;
  /** Ngày tạo đơn YYYY-MM-DD (giờ Việt Nam) */
  date?: string;
  page: number;
  limit: number;
}

export interface AdminOrderRow {
  orderId: number;
  orderCode: string;
  status: string;
  channel: string;
  paymentMethod: string | null;
  finalAmount: number;
  seatCount: number;
  createdAt: Date;
  customer: { id: number; fullName: string; email: string; phoneNumber: string };
  showtime: {
    id: number;
    startTime: Date;
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
  expiresAt: Date | null;
  seats: { seatLabel: string; price: number; ticketCode: string | null; ticketStatus: string | null }[];
  fnbItems: { name: string; quantity: number; unitPrice: number; subtotal: number; status: string }[];
}

export interface AdminOrderPage {
  items: AdminOrderRow[];
  total: number;
  /** Tổng hợp trên toàn bộ kết quả lọc (không chỉ trang hiện tại) */
  summary: { paidCount: number; paidRevenue: number };
}

export interface AdminOrderQueryPort {
  search(filter: AdminOrderFilter): Promise<AdminOrderPage>;
  findDetail(orderId: string): Promise<AdminOrderDetail | null>;
}

export const ADMIN_ORDER_QUERY = Symbol('ADMIN_ORDER_QUERY');
