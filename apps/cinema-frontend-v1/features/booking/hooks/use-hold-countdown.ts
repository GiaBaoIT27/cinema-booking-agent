"use client";

import { useEffect, useState } from "react";
import { useBooking } from "../context/booking-context";

/** Đếm ngược thời gian giữ ghế theo mốc hết hạn lưu trong BookingContext */
export function useHoldCountdown() {
  const { holdExpiresAt } = useBooking();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (holdExpiresAt === null) return;
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= holdExpiresAt) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [holdExpiresAt]);

  const hasHold = holdExpiresAt !== null;
  const secondsLeft = hasHold
    ? Math.max(0, Math.ceil((holdExpiresAt - now) / 1000))
    : 0;

  return { hasHold, secondsLeft, isExpired: hasHold && secondsLeft === 0 };
}
