"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookingStepper } from "@/features/booking/components/booking-stepper";
import {
  SeatSelectionMap,
  type Seat,
} from "@/features/seats/components/seat-selection-map";
import { BookingHydrationGate } from "@/features/booking/components/booking-hydration-gate";
import { useBooking } from "@/features/booking/context/booking-context";
import { useSeatHold } from "@/features/booking/hooks/use-seat-hold";
import {
  findStaleHold,
  type StaleHold,
} from "@/features/booking/utils/hold-flow";

interface SeatSelectionPageProps {
  searchParams: Promise<{ showtimeId?: string }>;
}

const EXPIRED_MESSAGE = "Đã hết thời gian giữ ghế. Vui lòng chọn lại ghế.";

export default function SeatSelectionPage({
  searchParams,
}: SeatSelectionPageProps) {
  const { showtimeId = "" } = use(searchParams);

  // key theo suất chiếu: đổi suất chiếu thì state của trang được làm mới
  return (
    <BookingHydrationGate>
      <SeatSelectionContent key={showtimeId} showtimeId={showtimeId} />
    </BookingHydrationGate>
  );
}

function SeatSelectionContent({ showtimeId }: { showtimeId: string }) {
  const router = useRouter();
  const {
    selectedSeats: contextSeats,
    showtimeId: contextShowtimeId,
    holdExpiries,
    addHeldSeat,
    removeHeldSeat,
    clearHolds,
  } = useBooking();
  const { toggleSeat, releaseSeats, error, setError } = useSeatHold();

  const findStale = () =>
    findStaleHold({
      contextShowtimeId,
      contextSeatIds: contextSeats.map((s) => s.id),
      expiries: holdExpiries,
      showtimeId,
      now: Date.now(),
    });

  // Ghế đang giữ cho suất chiếu khác, hoặc đã hết hạn: cần trả lại ngay khi vào trang
  const [staleHold, setStaleHold] = useState<StaleHold | null>(findStale);
  // Ghế chính khách từng giữ trong lượt này: server báo "đã giữ" nhưng khách
  // vẫn phải thấy và bỏ chọn được
  const [ownSeatIds, setOwnSeatIds] = useState<string[]>(() =>
    findStale() ? [] : contextSeats.map((s) => s.id),
  );
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  // Tăng giá trị này để tải lại trạng thái ghế mới nhất từ server
  const [refreshKey, setRefreshKey] = useState(0);

  // Trả ghế của suất khác / ghế đã hết hạn, rồi xóa khỏi context để đồng hồ
  // không đếm tiếp cho ghế không còn giữ
  useEffect(() => {
    if (!staleHold) return;

    (async () => {
      if (staleHold.showtimeId !== null && staleHold.seatIds.length > 0) {
        await releaseSeats(staleHold.showtimeId, staleHold.seatIds);
      }
      clearHolds();
      setOwnSeatIds([]);
      setRefreshKey((k) => k + 1);
      setStaleHold(null);
    })();
  }, [staleHold, releaseSeats, clearHolds]);

  // Chỉ ghế thuộc suất chiếu này và đã giữ thành công mới được coi là đã chọn
  const selectedSeats: Seat[] =
    staleHold === null && contextShowtimeId === showtimeId ? contextSeats : [];
  const selectedSeatIds = selectedSeats.map((s) => s.id);

  const totalPrice = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);

  const canContinue =
    Boolean(showtimeId) &&
    selectedSeats.length > 0 &&
    pendingIds.length === 0 &&
    staleHold === null;

  const handleToggleSeat = async (seat: Seat) => {
    const showtimeNumber = Number(showtimeId);
    const seatNumber = Number(seat.id);
    if (
      staleHold ||
      pendingIds.includes(seat.id) ||
      isNaN(showtimeNumber) ||
      isNaN(seatNumber)
    ) {
      return;
    }

    // Đã hết hạn giữ ghế: trả lại toàn bộ và bắt đầu lại
    const stale = findStale();
    if (stale) {
      setError(EXPIRED_MESSAGE);
      setStaleHold(stale);
      return;
    }

    const isSelected = selectedSeatIds.includes(seat.id);
    setPendingIds((ids) => [...ids, seat.id]);

    try {
      const outcome = await toggleSeat({
        showtimeId: showtimeNumber,
        seatId: seatNumber,
        isSelected,
        expiresAt: holdExpiries[seat.id],
      });

      if (outcome.kind === "held") {
        addHeldSeat(seat, showtimeId, outcome.expiresAt);
        setOwnSeatIds((ids) =>
          ids.includes(seat.id) ? ids : [...ids, seat.id],
        );
      } else if (outcome.kind === "released") {
        removeHeldSeat(seat.id);
      } else if (outcome.kind === "hold-failed") {
        // Có thể ghế vừa bị người khác giữ/đặt: tải lại để thấy trạng thái mới
        setOwnSeatIds(selectedSeatIds);
        setRefreshKey((k) => k + 1);
      }
    } finally {
      setPendingIds((ids) => ids.filter((id) => id !== seat.id));
    }
  };

  const handleNextStep = () => {
    if (!canContinue) return;

    const stale = findStale();
    if (stale) {
      setError(EXPIRED_MESSAGE);
      setStaleHold(stale);
      return;
    }

    router.push("/booking/combo-selection");
  };

  return (
    <div className="min-h-screen bg-[#080C15] pb-28 text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Tiêu đề trang */}
        <h1 className="text-xl font-black uppercase tracking-tight sm:text-2xl">
          Chọn Ghế
        </h1>

        {/* Stepper + Timer */}
        <BookingStepper currentStep={1} />

        {/* Lỗi giữ/trả ghế (vd ghế vừa bị người khác giữ) */}
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-[#EF4444]/40 bg-[#EF4444]/10 px-4 py-3 text-sm text-[#EF4444]"
          >
            {error}
          </div>
        )}

        {/* Sơ đồ ghế */}
        <div className="rounded-xl border border-[#1F2937] bg-[#111827]/60 p-4 sm:p-8 backdrop-blur">
          <SeatSelectionMap
            showtimeId={showtimeId}
            selectedSeatIds={selectedSeatIds}
            pendingSeatIds={pendingIds}
            ownSeatIds={ownSeatIds}
            refreshKey={refreshKey}
            onToggleSeat={handleToggleSeat}
          />
        </div>
      </div>

      {/* THANH TỔNG TIỀN TẠM TÍNH (STICKY BOTTOM BAR) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#1F2937] bg-[#0B0F19]/95 p-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          {/* Thông tin ghế đã chọn */}
          <div className="space-y-1">
            <p className="text-xs text-[#9CA3AF]">
              Ghế đã chọn:{" "}
              <strong className="text-white">
                {selectedSeats.length > 0
                  ? selectedSeats.map((s) => s.label).join(", ")
                  : "Chưa chọn"}
              </strong>
            </p>
            <p className="text-sm font-bold sm:text-base">
              Tổng tiền:{" "}
              <span className="text-[#EF4444]">
                {totalPrice.toLocaleString("vi-VN")} đ
              </span>
            </p>
          </div>

          {/* Nút Tiếp tục */}
          <button
            type="button"
            disabled={!canContinue}
            onClick={handleNextStep}
            className="flex h-11 items-center rounded-lg bg-[#EF4444] px-8 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#F87171] active:scale-[0.98] disabled:opacity-40 disabled:hover:bg-[#EF4444]"
          >
            Tiếp Tục
          </button>
        </div>
      </div>
    </div>
  );
}
