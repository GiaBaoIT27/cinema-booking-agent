import { useQuery } from "@tanstack/react-query";
import { orderService } from "../services/order.service";
import type { OrderListItem } from "../types/order.types";

const select = (orders: OrderListItem[]) =>
  [...orders].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

export function useMyOrders(enabled: boolean) {
  return useQuery({
    queryKey: ["orders", "my"] as const,
    queryFn: () => orderService.getMyOrders(),
    select,
    enabled,
  });
}
