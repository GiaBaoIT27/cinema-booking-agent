"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Hook kiểm tra component đã mounted phía client hay chưa mà không vi phạm
 * quy tắc react-hooks/set-state-in-effect và không gây cascading re-renders.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

