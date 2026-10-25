import { useCallback, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { orderService } from "../services/order.service";

const POLL_MS = 2000;
const POLL_WINDOW_MS = 60_000;

/**
 * Theo dõi đơn sau khi quay về từ cổng thanh toán. Kết quả thật đến từ IPN nên đơn có thể
 * còn PENDING vài giây: hỏi lại mỗi 2 giây trong 60 giây. Hết cửa sổ thì dừng, người dùng
 * bấm "Kiểm tra lại" để hỏi tiếp.
 */
export function useOrderStatus(orderId: number) {
  const pollUntil = useRef(Date.now() + POLL_WINDOW_MS);
  const [polling, setPolling] = useState(true);

  const query = useQuery({
    queryKey: ["orders", "detail", orderId] as const,
    queryFn: ({ signal }) => orderService.getOrder(orderId, signal),
    enabled: Number.isInteger(orderId) && orderId > 0,
    refetchInterval: (q) => {
      const pending = q.state.data?.status === "PENDING";
      if (!pending) return false;
      if (Date.now() >= pollUntil.current) {
        setPolling(false);
        return false;
      }
      return POLL_MS;
    },
  });

  const checkAgain = useCallback(() => {
    pollUntil.current = Date.now() + POLL_WINDOW_MS;
    setPolling(true);
    void query.refetch();
  }, [query]);

  return { ...query, polling, checkAgain };
}
