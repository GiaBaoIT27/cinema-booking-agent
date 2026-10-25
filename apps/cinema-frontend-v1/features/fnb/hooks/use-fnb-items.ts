"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fnbService } from "../services/fnb.service";
import { toComboItem } from "../utils/fnb-adapter";
import type { FnbCategory, FnbItem, FnbItemType } from "../types/fnb.type";

interface UseFnbItemsOptions {
  category?: FnbCategory;
  type?: FnbItemType;
  /** Mặc định chỉ lấy sản phẩm đang kinh doanh */
  isActive?: boolean;
  /** Mặc định 100 (tối đa backend cho phép) */
  limit?: number;
}

interface FnbItemsResult {
  requestKey: string;
  items: FnbItem[];
  error: string | null;
}

// Tham chiếu ổn định để useMemo không tính lại mỗi lần render
const EMPTY_ITEMS: FnbItem[] = [];

export function useFnbItems(options: UseFnbItemsOptions = {}) {
  const { category, type, isActive = true, limit = 100 } = options;

  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<FnbItemsResult | null>(null);

  const requestKey = [category, type, isActive, limit, reloadCount].join("|");

  useEffect(() => {
    let cancelled = false;

    fnbService
      .getItems({ category, type, isActive, limit })
      .then((items) => {
        if (cancelled) return;
        setResult({ requestKey, items, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setResult({
          requestKey,
          items: EMPTY_ITEMS,
          error:
            err instanceof Error
              ? err.message
              : "Lỗi khi tải danh sách bắp nước",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [category, type, isActive, limit, requestKey]);

  // Kết quả chỉ hợp lệ nếu thuộc về request hiện tại; nếu không → đang tải.
  const current = result && result.requestKey === requestKey ? result : null;

  const items = current?.items ?? EMPTY_ITEMS;
  const combos = useMemo(() => items.map(toComboItem), [items]);
  const error = current?.error ?? null;
  const isLoading = current === null;

  const refetch = useCallback(() => setReloadCount((c) => c + 1), []);

  return { items, combos, isLoading, error, refetch };
}
