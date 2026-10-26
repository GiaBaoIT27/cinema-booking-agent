import { apiClient } from "@/lib/api-client";
import type {
  CreateOrderPayload,
  OrderCancelled,
  OrderCreated,
  OrderDetail,
  OrderListItem,
} from "../types/order.types";

export const orderService = {
  /** POST /api/v1/orders: tạo đơn PENDING từ các ghế đang giữ */
  createOrder(payload: CreateOrderPayload): Promise<OrderCreated> {
    return apiClient.post<OrderCreated>("/orders", payload);
  },
  /** GET /api/v1/orders/my */
  getMyOrders(): Promise<OrderListItem[]> {
    return apiClient.get<OrderListItem[]>("/orders/my");
  },
  /** GET /api/v1/orders/:id: kèm vé khi đã thanh toán */
  getOrder(orderId: number, signal?: AbortSignal): Promise<OrderDetail> {
    return apiClient.get<OrderDetail>(`/orders/${orderId}`, { signal });
  },
  /** POST /api/v1/orders/:id/cancel: hủy đơn PENDING và nhả ghế */
  cancelOrder(orderId: number): Promise<OrderCancelled> {
    return apiClient.post<OrderCancelled>(`/orders/${orderId}/cancel`, {});
  },
};

export type OrderApi = Pick<
  typeof orderService,
  "createOrder" | "getOrder" | "cancelOrder" | "getMyOrders"
>;
