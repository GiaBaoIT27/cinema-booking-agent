"use client";

import { ShieldCheck } from "lucide-react";

export interface BookingSummaryData {
  movieTitle: string;
  ageRating: string;
  format: string;
  cinemaName: string;
  cinemaAddress: string;
  showtime: string;
  date: string;
  hall: string;
  ticketCount: number;
  seatType: string;
  seats: string[];
  comboDescription: string;
  ticketPrice: number;
  comboPrice: number;
  discountPrice: number;
  discountCode?: string;
}

interface BookingSummaryCardProps {
  summary: BookingSummaryData;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

export function BookingSummaryCard({
  summary,
  onConfirm,
  isSubmitting = false,
}: BookingSummaryCardProps) {
  const totalPrice =
    summary.ticketPrice + summary.comboPrice - summary.discountPrice;

  return (
    <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-5 space-y-5">
      {/* Tiêu đề Phim & Nhãn */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-base font-black uppercase tracking-tight text-white sm:text-lg">
            {summary.movieTitle}
          </h3>
          <span className="rounded bg-[#EF4444] px-1.5 py-0.5 text-[10px] font-bold text-white">
            {summary.ageRating}
          </span>
          <span className="rounded bg-[#1F2937] px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
            {summary.format}
          </span>
        </div>

        <p className="text-xs font-bold text-slate-200">{summary.cinemaName}</p>
        <p className="text-[11px] leading-relaxed text-[#9CA3AF]">
          {summary.cinemaAddress}
        </p>
      </div>

      {/* Thông tin suất chiếu & ghế */}
      <div className="space-y-3 pt-2 text-xs">
        <div>
          <span className="text-[#9CA3AF]">Thời gian</span>
          <p className="font-semibold text-white">
            {summary.showtime} {summary.date}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[#9CA3AF]">Phòng chiếu</span>
            <p className="font-semibold text-white">{summary.hall}</p>
          </div>
          <div>
            <span className="text-[#9CA3AF]">Số vé</span>
            <p className="font-semibold text-white">
              {summary.ticketCount.toString().padStart(2, "0")}
            </p>
          </div>
          <div>
            <span className="text-[#9CA3AF]">Loại ghế</span>
            <p className="font-semibold text-white">{summary.seatType}</p>
          </div>
          <div>
            <span className="text-[#9CA3AF]">Số ghế</span>
            <p className="font-semibold text-white">
              {summary.seats.join(", ")}
            </p>
          </div>
        </div>

        <div>
          <span className="text-[#9CA3AF]">Combo</span>
          <p className="font-medium text-slate-300">
            {summary.comboDescription}
          </p>
        </div>
      </div>

      <hr className="border-dashed border-[#1F2937]" />

      {/* Chi tiết giá tiền */}
      <div className="space-y-2 text-xs">
        <div className="flex justify-between text-[#9CA3AF]">
          <span>
            Giá vé ({summary.ticketCount}x Ghế {summary.seatType})
          </span>
          <span className="font-medium text-white">
            {summary.ticketPrice.toLocaleString("vi-VN")} VNĐ
          </span>
        </div>
        <div className="flex justify-between text-[#9CA3AF]">
          <span>Bắp nước (Combo)</span>
          <span className="font-medium text-white">
            {summary.comboPrice.toLocaleString("vi-VN")} VNĐ
          </span>
        </div>
        {summary.discountPrice > 0 && (
          <div className="flex justify-between text-[#EF4444]">
            <span>Khuyến mãi ({summary.discountCode})</span>
            <span className="font-semibold">
              -{summary.discountPrice.toLocaleString("vi-VN")} VNĐ
            </span>
          </div>
        )}
      </div>

      <hr className="border-[#1F2937]" />

      {/* Tổng tiền */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase text-white">
          TỔNG TIỀN
        </span>
        <span className="text-xl font-black text-[#F59E0B]">
          {totalPrice.toLocaleString("vi-VN")} VNĐ
        </span>
      </div>

      {/* Nút xác nhận */}
      <button
        type="button"
        disabled={isSubmitting}
        onClick={onConfirm}
        className="w-full rounded-lg bg-[#EF4444] py-3.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#F87171] active:scale-[0.99] disabled:opacity-50"
      >
        {isSubmitting ? "Đang xử lý..." : "XÁC NHẬN THANH TOÁN"}
      </button>

      {/* Bảo mật PCI-DSS */}
      <div className="flex items-center justify-center gap-1.5 text-center text-[10px] text-[#6B7280]">
        <ShieldCheck size={13} className="text-[#6B7280]" />
        <span>
          Thông tin thanh toán của bạn được mã hóa an toàn đạt chuẩn PCI-DSS.
        </span>
      </div>
    </div>
  );
}
