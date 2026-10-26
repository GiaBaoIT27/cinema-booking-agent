import type { OrderListItem, OrderStatus } from "../types/order.types";
import { colors } from "@/theme/colors";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  EXPIRED: "Hết hạn",
  CANCELLED: "Đã hủy",
  REFUNDED: "Đã hoàn tiền",
};

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING: colors.warning,
  PAID: colors.success,
  EXPIRED: colors.subtle,
  CANCELLED: colors.subtle,
  REFUNDED: colors.muted,
};

export type OrderFilter = "ALL" | "PAID" | "PENDING" | "CLOSED";

export const ORDER_FILTERS: { key: OrderFilter; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "PAID", label: "Đã thanh toán" },
  { key: "PENDING", label: "Chờ thanh toán" },
  { key: "CLOSED", label: "Đã hủy/hết hạn" },
];

export function matchesFilter(
  order: OrderListItem,
  filter: OrderFilter,
): boolean {
  switch (filter) {
    case "ALL":
      return true;
    case "PAID":
      return order.status === "PAID";
    case "PENDING":
      return order.status === "PENDING";
    case "CLOSED":
      return (
        order.status === "EXPIRED" ||
        order.status === "CANCELLED" ||
        order.status === "REFUNDED"
      );
  }
}
