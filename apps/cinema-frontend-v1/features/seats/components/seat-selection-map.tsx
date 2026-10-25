"use client";

import { useMemo } from "react";

import { useShowtimeSeats } from "../hooks/use-showtime-seats";
import { markOwnHeldSeats } from "../utils/seat-adapter";
import type { Seat, SeatMapLayout } from "../types/seat.type";

// Giữ nguyên export này để BookingContext và các trang khác import không đổi
export type { Seat } from "../types/seat.type";

interface SeatSelectionMapProps {
  /** Mã suất chiếu (lấy từ ?showtimeId= trên URL) */
  showtimeId?: string | number | null;
  /** Ghế đang chọn (đã giữ thành công). Trang cha quản lý danh sách này */
  selectedSeatIds: string[];
  /** Ghế đang chờ server xác nhận giữ/trả: tạm khóa, hiện mờ */
  pendingSeatIds?: string[];
  /** Ghế chính khách từng giữ: luôn chọn được dù server báo đã giữ */
  ownSeatIds?: string[];
  /** Đổi giá trị này để tải lại trạng thái ghế từ server */
  refreshKey?: number;
  /** Khách bấm vào ghế; trang cha gọi API giữ/trả ghế */
  onToggleSeat: (seat: Seat) => void;
}

interface SeatGridProps {
  layout: SeatMapLayout;
  selectedIds: Set<string>;
  pendingIds: Set<string>;
  onToggleSeat: (seat: Seat) => void;
}

function getSeatClassName(seat: Seat, isSelected: boolean): string {
  if (isSelected)
    return "bg-[#EF4444] text-white font-bold ring-2 ring-red-400";
  if (seat.isBooked)
    return "bg-[#111827] text-[#4B5563] cursor-not-allowed border border-[#1F2937]";
  if (seat.type === "vip") return "bg-[#D97706] text-white hover:bg-[#B45309]";
  if (seat.type === "couple")
    return "bg-[#EC4899] text-white hover:bg-[#DB2777]";
  return "bg-[#2A324B] text-white hover:bg-[#3B4566]";
}

/** Lưới ghế: mỗi ghế đặt đúng hàng/cột, ghế đôi chiếm 2 cột */
export function SeatGrid({
  layout,
  selectedIds,
  pendingIds,
  onToggleSeat,
}: SeatGridProps) {
  return (
    <div
      className="grid gap-1.5 sm:gap-2"
      style={{
        gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
      }}
    >
      {layout.cells.map(({ seat, row, col, span }) => {
        const isSelected = selectedIds.has(seat.id);
        const isPending = pendingIds.has(seat.id);
        return (
          <button
            key={seat.id}
            type="button"
            disabled={seat.isBooked || isPending}
            onClick={() => onToggleSeat(seat)}
            title={`${seat.label} - ${seat.price.toLocaleString("vi-VN")} đ`}
            style={{ gridColumn: `${col} / span ${span}`, gridRow: row + 1 }}
            className={`flex h-8 w-full items-center justify-center text-[11px] font-medium transition ${
              seat.type === "couple" ? "rounded-lg font-bold" : "rounded-t-md"
            } ${getSeatClassName(seat, isSelected)} ${
              isPending ? "animate-pulse cursor-wait opacity-60" : ""
            }`}
          >
            {seat.label}
          </button>
        );
      })}
    </div>
  );
}

export function SeatSelectionMap({
  showtimeId,
  selectedSeatIds,
  pendingSeatIds = [],
  ownSeatIds = [],
  refreshKey = 0,
  onToggleSeat,
}: SeatSelectionMapProps) {
  const {
    layout: serverLayout,
    info,
    isValidId,
    isLoading,
    error,
    refetch,
  } = useShowtimeSeats(showtimeId, refreshKey);

  // Khóa chuỗi để không phụ thuộc vào việc cha tạo mảng mới mỗi lần render
  const ownKey = ownSeatIds.join(",");
  const layout = useMemo(
    () =>
      markOwnHeldSeats(serverLayout, new Set(ownKey ? ownKey.split(",") : [])),
    [serverLayout, ownKey],
  );

  const selectedIds = useMemo(
    () => new Set(selectedSeatIds),
    [selectedSeatIds],
  );
  const pendingIds = useMemo(() => new Set(pendingSeatIds), [pendingSeatIds]);

  return (
    <div className="flex flex-col items-center space-y-10 py-6">
      {/* 1. MÀN HÌNH CHIẾU (Curved Screen) */}
      <div className="w-full max-w-2xl text-center space-y-3">
        <div className="relative h-12 w-full overflow-hidden">
          {/* Đường cong sáng */}
          <div className="absolute top-0 left-1/2 h-75 w-[140%] -translate-x-1/2 rounded-[100%] border-t-2 border-[#EF4444] bg-linear-to-b from-[#EF4444]/20 via-[#EF4444]/5 to-transparent shadow-[0_-10px_30px_rgba(239,68,68,0.3)]" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#9CA3AF]">
          Màn Hình Chiếu
        </p>
        {info && (
          <p className="text-[11px] text-[#6B7280]">
            {info.auditoriumName} · Còn {info.availableSeats}/{info.totalSeats}{" "}
            ghế
          </p>
        )}
      </div>

      {/* 2. KHU VỰC GHẾ (GRID) */}
      <div className="w-full overflow-x-auto pb-4 scrollbar-none">
        <div className="mx-auto min-w-170 max-w-3xl">
          {!isValidId ? (
            <div className="rounded-xl border border-dashed border-[#1F2937] py-12 text-center text-sm text-[#9CA3AF]">
              Không tìm thấy suất chiếu. Vui lòng chọn lại suất chiếu.
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
              {Array.from({ length: 60 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-8 animate-pulse rounded-t-md bg-[#1F2937]"
                />
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
          ) : layout.cells.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#1F2937] py-12 text-center text-sm text-[#9CA3AF]">
              Suất chiếu này chưa có sơ đồ ghế.
            </div>
          ) : (
            <SeatGrid
              layout={layout}
              selectedIds={selectedIds}
              pendingIds={pendingIds}
              onToggleSeat={onToggleSeat}
            />
          )}
        </div>
      </div>

      {/* 3. CHÚ THÍCH LOẠI GHẾ (LEGEND) */}
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-[#9CA3AF] pt-4">
        <div className="flex items-center gap-2">
          <span className="h-4 w-5 rounded-t-sm bg-[#2A324B]" />
          <span>Ghế Thường</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-4 w-7 rounded-sm bg-[#EC4899]" />
          <span>Ghế Đôi (2 Người)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-4 w-5 rounded-t-sm bg-[#D97706]" />
          <span>Ghế VIP</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-4 w-5 rounded-t-sm bg-[#EF4444]" />
          <span>Ghế chọn</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-4 w-5 rounded-t-sm bg-[#111827] border border-[#1F2937]" />
          <span>Ghế đã đặt</span>
        </div>
      </div>
    </div>
  );
}
