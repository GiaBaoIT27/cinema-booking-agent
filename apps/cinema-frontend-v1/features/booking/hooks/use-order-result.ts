"use client";

import { useEffect, useState } from "react";
import { orderService } from "@/features/orders/services/order.service";
import type { OrderDetail } from "@/features/orders/types/order.type";

interface ResultState {
  key: string;
  order: OrderDetail | null;
  error: string | null;
}

const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 1500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** txnRef có dạng "<orderCode>_<timestamp>" → lấy orderCode */
export function orderCodeFromTxnRef(txnRef?: string | null): string | null {
  if (!txnRef) return null;
  const i = txnRef.lastIndexOf("_");
  return i > 0 ? txnRef.slice(0, i) : null;
}

/**
 * Lấy chi tiết đơn sau khi quay về từ cổng thanh toán.
 * - Có orderId (lưu trước khi sang VNPay) → dùng luôn.
 * - Không có (mất sessionStorage, mở tab khác...) → tìm theo orderCode rút từ txnRef.
 * - Cổng báo thành công nhưng đơn còn PENDING → thử lại vài lần.
 */
export function useOrderResult(
  orderId: number | null,
  txnRef: string | undefined,
  expectPaid: boolean,
) {
  const orderCode = orderCodeFromTxnRef(txnRef);
  // Danh tính đơn phải ổn định: orderCode lấy từ URL không đổi khi trang dọn
  // sessionStorage sau thanh toán (orderId lưu ở đó sẽ biến mất → không được dùng làm khóa)
  const identity = orderCode ?? (orderId !== null ? `#${orderId}` : null);
  const requestKey = identity === null ? "" : `${identity}|${expectPaid}`;
  const [result, setResult] = useState<ResultState>({
    key: "",
    order: null,
    error: null,
  });

  useEffect(() => {
    if (identity === null) return;
    let cancelled = false;

    const fail = (message: string) => {
      if (!cancelled)
        setResult({ key: requestKey, order: null, error: message });
    };

    (async () => {
      let id: number | null = identity.startsWith("#")
        ? Number(identity.slice(1))
        : null;
      if (id === null) {
        try {
          const mine = await orderService.getMyOrders();
          id = mine.find((o) => o.orderCode === identity)?.orderId ?? null;
        } catch (e) {
          return fail(
            e instanceof Error
              ? e.message
              : "Không thể tải danh sách đơn hàng.",
          );
        }
        if (cancelled) return;
        if (id === null) {
          return fail(`Không tìm thấy đơn hàng ${identity} của tài khoản này.`);
        }
      }

      let last: OrderDetail | null = null;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        try {
          last = await orderService.getOrder(id);
        } catch (e) {
          return fail(
            e instanceof Error
              ? e.message
              : "Không thể tải thông tin đơn hàng.",
          );
        }
        if (cancelled) return;
        if (!expectPaid || last.status !== "PENDING") break;
        await sleep(RETRY_DELAY_MS);
        if (cancelled) return;
      }
      setResult({ key: requestKey, order: last, error: null });
    })();

    return () => {
      cancelled = true;
    };
  }, [identity, expectPaid, requestKey]);

  const isLoading = identity !== null && result.key !== requestKey;
  const current = result.key === requestKey;
  return {
    isLoading,
    order: current ? result.order : null,
    error: current ? result.error : null,
  };
}
