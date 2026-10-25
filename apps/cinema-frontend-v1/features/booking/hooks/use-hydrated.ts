"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * false khi render trên server và ở lượt hydrate đầu tiên, true sau đó.
 * Dùng cho phần giao diện phụ thuộc dữ liệu chỉ có ở trình duyệt (sessionStorage, giờ hiện tại).
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
