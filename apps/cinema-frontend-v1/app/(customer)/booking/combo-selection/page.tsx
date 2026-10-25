"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { BookingStepper } from "@/features/booking/components/booking-stepper";
import {
  ComboCard,
  groupFnbByCategory,
  toComboItem,
  useFnbItems,
} from "@/features/fnb";
import { BookingHydrationGate } from "@/features/booking/components/booking-hydration-gate";
import { useBooking } from "@/features/booking/context/booking-context";

export default function ComboSelectionPage() {
  return (
    <BookingHydrationGate>
      <ComboSelectionContent />
    </BookingHydrationGate>
  );
}

function ComboSelectionContent() {
  const router = useRouter();
  const {
    ticketPrice,
    selectedCombos,
    updateComboQuantity,
    comboPrice,
    showtimeId,
  } = useBooking();
  const { items, isLoading, error, refetch } = useFnbItems();

  const groups = useMemo(() => groupFnbByCategory(items), [items]);

  const handleIncrease = (id: string) => {
    // Lưu kèm tên và giá thật để các bước sau (thanh toán) không phải tra lại
    const item = items.find((i) => i.id === id);
    updateComboQuantity(
      id,
      1,
      item ? { name: item.name, price: item.basePrice } : undefined,
    );
  };

  const handleDecrease = (id: string) => {
    updateComboQuantity(id, -1);
  };

  const grandTotal = ticketPrice + comboPrice;

  // Quay lại chọn ghế: đi thẳng về đúng suất chiếu thay vì router.back() để
  // vẫn đúng khi khách vào trang này trực tiếp (tải lại, mở tab mới)
  const handleBack = () => {
    router.push(
      showtimeId
        ? `/booking/seat-selection?showtimeId=${showtimeId}`
        : "/booking/seat-selection",
    );
  };

  const handleNextStep = () => {
    // Chuyển sang bước 3: Thanh toán
    router.push("/booking/checkout");
  };

  return (
    <div className="min-h-screen bg-[#080C15] pb-28 text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Tiêu đề trang */}
        <h1 className="text-xl font-black uppercase tracking-tight sm:text-2xl">
          Bắp Nước
        </h1>

        {/* Stepper Bước 2 */}
        <BookingStepper currentStep={2} />

        {/* Danh sách bắp nước theo nhóm (3 cột) */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="flex animate-pulse gap-3.5 rounded-xl border border-[#1F2937] bg-[#111827] p-3.5"
              >
                <div className="h-28 w-28 shrink-0 rounded-lg bg-[#1F2937]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 rounded bg-[#1F2937]" />
                  <div className="h-3 w-full rounded bg-[#1F2937]" />
                  <div className="h-3 w-1/3 rounded bg-[#1F2937]" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="space-y-3 rounded-xl border border-dashed border-[#1F2937] py-12 text-center">
            <p className="text-sm text-[#EF4444]">{error}</p>
            <button
              type="button"
              onClick={refetch}
              className="rounded-lg border border-[#374151] px-5 py-2 text-xs font-semibold text-white transition hover:border-[#EF4444] hover:bg-[#EF4444]"
            >
              Thử lại
            </button>
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#1F2937] py-12 text-center text-sm text-[#9CA3AF]">
            Hiện chưa có sản phẩm bắp nước nào. Bạn có thể bỏ qua bước này.
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <section key={group.category} className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#9CA3AF]">
                  {group.label}
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((item) => (
                    <ComboCard
                      key={item.id}
                      combo={toComboItem(item)}
                      quantity={selectedCombos[item.id] || 0}
                      onIncrease={handleIncrease}
                      onDecrease={handleDecrease}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* THANH TỔNG TIỀN NỔI (STICKY BOTTOM BAR) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#1F2937] bg-[#0B0F19]/95 p-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          {/* Nút Quay lại chọn ghế */}
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2 rounded-lg border border-[#374151] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#1F2937]"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Quay Lại</span>
          </button>

          {/* Chi tiết tổng tiền */}
          <div className="text-right sm:text-left space-y-0.5">
            <p className="text-xs text-[#9CA3AF]">
              Vé ghế:{" "}
              <span className="text-white font-medium">
                {ticketPrice.toLocaleString("vi-VN")} đ
              </span>
              {comboPrice > 0 && (
                <>
                  {" "}
                  + Bắp nước:{" "}
                  <span className="text-white font-medium">
                    {comboPrice.toLocaleString("vi-VN")} đ
                  </span>
                </>
              )}
            </p>
            <p className="text-base font-black sm:text-lg">
              Tổng thanh toán:{" "}
              <span className="text-[#EF4444]">
                {grandTotal.toLocaleString("vi-VN")} đ
              </span>
            </p>
          </div>

          {/* Nút Chuyển sang bước Thanh toán */}
          <button
            type="button"
            onClick={handleNextStep}
            className="flex h-11 items-center rounded-lg bg-[#EF4444] px-8 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#F87171] active:scale-[0.98]"
          >
            Thanh Toán
          </button>
        </div>
      </div>
    </div>
  );
}
