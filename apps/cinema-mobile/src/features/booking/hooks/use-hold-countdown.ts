import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { selectHoldExpiresAt, useBookingStore } from "@/store/booking.store";

/** Đếm ngược thời gian giữ ghế; tính lại ngay khi app quay lại foreground. */
export function useHoldCountdown() {
  const holdExpiresAt = useBookingStore(selectHoldExpiresAt);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (holdExpiresAt === null) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") setNow(Date.now());
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [holdExpiresAt]);

  const hasHold = holdExpiresAt !== null;
  const secondsLeft = hasHold
    ? Math.max(0, Math.ceil((holdExpiresAt - now) / 1000))
    : 0;
  return { hasHold, secondsLeft, isExpired: hasHold && secondsLeft === 0 };
}

export function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
