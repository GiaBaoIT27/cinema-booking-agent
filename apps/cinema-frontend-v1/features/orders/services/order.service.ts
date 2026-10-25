import { apiClient } from "@/lib/api-client";
import type {
  CreateOrderPayload,
  OrderCancelled,
  OrderCreated,
  OrderDetail,
  OrderListItem,
} from "../types/order.type";

export const orderService = {
  /** POST /api/v1/orders – tạo đơn PENDING từ các ghế đang giữ */
  async createOrder(payload: CreateOrderPayload): Promise<OrderCreated> {
    return apiClient.post<OrderCreated>("/orders", payload);
  },

  /** GET /api/v1/orders/my – danh sách đơn của tôi */
  async getMyOrders(): Promise<OrderListItem[]> {
    return apiClient.get<OrderListItem[]>("/orders/my");
  },

  /** GET /api/v1/orders/:id – chi tiết đơn (kèm vé khi đã thanh toán) */
  async getOrder(orderId: number): Promise<OrderDetail> {
    return apiClient.get<OrderDetail>(`/orders/${orderId}`);
  },

  /** POST /api/v1/orders/:id/cancel – hủy đơn PENDING và nhả ghế */
  async cancelOrder(orderId: number): Promise<OrderCancelled> {
    return apiClient.post<OrderCancelled>(`/orders/${orderId}/cancel`, {});
  },
};

export type OrderApi = Pick<
  typeof orderService,
  "createOrder" | "getOrder" | "cancelOrder" | "getMyOrders"
>;
