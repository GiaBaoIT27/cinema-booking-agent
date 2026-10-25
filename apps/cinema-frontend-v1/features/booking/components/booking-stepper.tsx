"use client";

import Link from "next/link";
import { Clock } from "lucide-react";

import { useBooking } from "../context/booking-context";
import { useHoldCountdown } from "../hooks/use-hold-countdown";
import { useHydrated } from "../hooks/use-hydrated";

interface BookingStepperProps {
  currentStep: 1 | 2 | 3;
}

export function BookingStepper({ currentStep }: BookingStepperProps) {
  const { showtimeId } = useBooking();
  const { hasHold, secondsLeft, isExpired } = useHoldCountdown();
  // Thông tin giữ ghế đọc từ sessionStorage nên chỉ có ở trình duyệt:
  // chờ hydrate xong mới hiện để HTML server và client khớp nhau
  const hydrated = useHydrated();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const reselectHref = showtimeId
    ? `/booking/seat-selection?showtimeId=${showtimeId}`
    : "/booking/seat-selection";

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#1F2937] pb-6">
      {/* Các bước đặt vé */}
      <div className="flex items-center gap-2 text-xs font-bold sm:text-sm">
        <span
          className={currentStep === 1 ? "text-[#EF4444]" : "text-[#6B7280]"}
        >
          1. CHỌN VÉ / GHẾ
        </span>
        <span className="text-[#374151]">&rarr;</span>
        <span
          className={currentStep === 2 ? "text-[#EF4444]" : "text-[#6B7280]"}
        >
          2. CHỌN BẮP NƯỚC
        </span>
        <span className="text-[#374151]">&rarr;</span>
        <span
          className={currentStep === 3 ? "text-[#EF4444]" : "text-[#6B7280]"}
        >
          3. THANH TOÁN
        </span>
      </div>

      {/* Countdown Timer: chỉ hiện khi đã giữ ghế thành công */}
      {hydrated &&
        hasHold &&
        (isExpired ? (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-[#EF4444]/40 bg-[#EF4444]/10 px-3.5 py-1.5 text-xs text-[#EF4444]"
          >
            <Clock size={15} />
            <span>Đã hết thời gian giữ ghế.</span>
            <Link href={reselectHref} className="font-bold underline">
              Chọn lại ghế
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-[#EF4444]/40 bg-[#EF4444]/10 px-3.5 py-1.5 text-xs text-[#EF4444]">
            <Clock size={15} />
            <span>
              Ghế của bạn được giữ trong{" "}
              <strong className="font-mono text-sm font-bold">
                {formatTime(secondsLeft)}
              </strong>
            </span>
          </div>
        ))}
    </div>
  );
}
