"use client";

import { useCallback, useEffect, useState } from "react";
import type { PageResult } from "../utils/pagination";

interface State<R> {
  key: string;
  data: R | null;
  error: string | null;
}

/**
 * Tải một trang dữ liệu theo `key` (chuỗi gộp các bộ lọc). Kết quả chỉ được dùng khi khớp key hiện tại,
 * nên đổi bộ lọc nhanh không bị hiện dữ liệu của request cũ (cùng cách làm với useMovies).
 */
export function usePaged<T, R extends PageResult<T> = PageResult<T>>(key: string, fetcher: () => Promise<R>) {
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<State<R> | null>(null);
  const requestKey = `${key}#${reload}`;

  useEffect(() => {
    let cancelled = false;
    fetcher()
      .then((data) => {
        if (!cancelled) setState({ key: requestKey, data, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setState({
            key: requestKey,
            data: null,
            error: err instanceof Error ? err.message : "Không tải được dữ liệu",
          });
      });
    return () => {
      cancelled = true;
    };
    // fetcher được tạo lại mỗi render; requestKey đã gói mọi tham số của nó
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const current = state && state.key === requestKey ? state : null;
  const refetch = useCallback(() => setReload((n) => n + 1), []);

  return {
    items: current?.data?.items ?? [],
    totalItems: current?.data?.totalItems ?? 0,
    totalPages: current?.data?.totalPages ?? 1,
    error: current?.error ?? null,
    isLoading: current === null,
    /** Toàn bộ kết quả (kể cả trường thêm như summary của đơn hàng) */
    data: current?.data ?? null,
    refetch,
  };
}
