"use client";

import type { ReactNode } from "react";
import { useBooking } from "../context/booking-context";

/**
 * Chỉ hiện nội dung sau khi BookingContext đã nạp dữ liệu từ sessionStorage.
 * Dùng bao các trang đặt vé: server và client cùng render khung chờ ở lượt đầu
 * nên không bị lệch hydration, và trang không đọc nhầm dữ liệu mặc định.
 */
export function BookingHydrationGate({ children }: { children: ReactNode }) {
  const { isHydrated } = useBooking();
  if (!isHydrated) {
    return <div className="min-h-screen bg-[#080C15]" aria-busy="true" />;
  }
  return <>{children}</>;
}
