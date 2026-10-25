"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckCircle2, Download, Bell, Share2 } from "lucide-react";

export interface SuccessTicket {
  id: number;
  ticketCode: string;
  price: number;
}

interface BookingSuccessCardProps {
  orderCode: string;
  tickets: SuccessTicket[];
  finalAmount: number;
  movieTitle?: string;
}

const qrUrl = (code: string) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(code)}`;

export function BookingSuccessCard({
  orderCode,
  tickets,
  finalAmount,
}: BookingSuccessCardProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = tickets[Math.min(activeIndex, tickets.length - 1)];
  const qrCodeUrl = active ? qrUrl(active.ticketCode) : "";
  const fileName = active?.ticketCode ?? orderCode;
  const [isSaved, setIsSaved] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);

  const handleDownloadQR = () => {
    setIsSaved(true);
    const link = document.createElement("a");
    link.href = qrCodeUrl;
    link.target = "_blank";
    link.download = `ticket-${fileName.toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="mx-auto max-w-xl space-y-6 text-center">
      {/* 1. THÔNG BÁO THÀNH CÔNG */}
      <div className="space-y-2">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#22C55E]/10 text-[#22C55E]">
          <CheckCircle2 size={36} />
        </div>
        <h1 className="text-xl font-black uppercase tracking-tight text-white sm:text-2xl">
          ĐẶT VÉ THÀNH CÔNG!
        </h1>
        <p className="text-xs text-[#9CA3AF] sm:text-sm">
          Mã đơn hàng: <strong className="text-white">{orderCode}</strong> ·
          Tổng thanh toán:{" "}
          <strong className="text-[#F59E0B]">
            {finalAmount.toLocaleString("vi-VN")} VNĐ
          </strong>
        </p>
      </div>

      {/* 2. MÃ QR VÀO PHÒNG CHIẾU */}
      <div className="flex flex-col items-center space-y-4 pt-2">
        {tickets.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2">
            {tickets.map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveIndex(i)}
                className={`rounded-lg border px-3 py-1 text-xs font-semibold ${
                  i === activeIndex
                    ? "border-[#EF4444] bg-[#EF4444]/10 text-white"
                    : "border-[#1F2937] text-[#9CA3AF]"
                }`}
              >
                Vé {i + 1}
              </button>
            ))}
          </div>
        )}

        {/* Khung QR Code Nền Trắng */}
        <div className="relative rounded-2xl bg-white p-4 shadow-2xl shadow-emerald-500/5">
          <div className="relative h-52 w-52 overflow-hidden sm:h-60 sm:w-60">
            {qrCodeUrl && (
              <Image
                src={qrCodeUrl}
                alt="Mã QR Vé Xem Phim"
                fill
                unoptimized
                className="object-contain"
                priority
              />
            )}
          </div>
        </div>
        {active && (
          <p className="font-mono text-sm font-semibold text-white">
            {active.ticketCode}
          </p>
        )}

        {/* Nút Lưu Mã QR */}
        <button
          type="button"
          onClick={handleDownloadQR}
          className="inline-flex items-center gap-2 rounded-lg bg-[#111827] px-4 py-2 text-xs font-semibold text-white border border-[#1F2937] transition hover:bg-[#1F2937] active:scale-95"
        >
          <Download size={15} />
          <span>{isSaved ? "Đã lưu về máy!" : "Lưu Mã QR"}</span>
        </button>

        <p className="max-w-md text-[11px] leading-relaxed text-[#9CA3AF]">
          Vui lòng đưa mã QR này cho nhân viên soát vé tại cửa phòng chiếu để
          quét tự động.
        </p>
      </div>

      {/* 3. CHIA SẺ VÀ NHẮC LỊCH */}
      <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-4 text-left space-y-3">
        {/* Chia sẻ vé */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#9CA3AF]">Chia sẻ vé cho bạn đi cùng:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[#25D366] text-white hover:opacity-90"
              title="Chia sẻ qua iMessage/SMS"
            >
              <Share2 size={13} />
            </button>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0088FF] text-white font-bold text-[10px] hover:opacity-90"
              title="Chia sẻ qua Zalo"
            >
              Zalo
            </button>
          </div>
        </div>

        {/* Bật thông báo nhắc lịch */}
        <button
          type="button"
          onClick={() => setReminderEnabled(!reminderEnabled)}
          className={`flex w-full items-center gap-2.5 rounded-lg border p-2.5 text-xs font-medium transition ${
            reminderEnabled
              ? "border-[#F59E0B] bg-[#F59E0B]/10 text-[#F59E0B]"
              : "border-[#1F2937] bg-[#0B0F19] text-[#F59E0B] hover:border-[#F59E0B]/40"
          }`}
        >
          <Bell size={16} className="shrink-0" />
          <span>
            {reminderEnabled
              ? "Đã bật nhắc lịch xem phim trước giờ chiếu 30 phút"
              : "Thông báo nhắc lịch xem phim trước giờ chiếu 30 phút"}
          </span>
        </button>
      </div>

      {/* 4. LƯU Ý QUAN TRỌNG */}
      <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-5 text-left space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
          LƯU Ý QUAN TRỌNG
        </h3>
        <ul className="space-y-2 text-[11px] leading-relaxed text-[#9CA3AF]">
          <li className="flex items-start gap-1.5">
            <span className="select-none">•</span>
            <span>
              Vui lòng có mặt tại rạp trước giờ chiếu tối thiểu 15 phút để đảm
              bảo trải nghiệm tốt nhất.
            </span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="select-none">•</span>
            <span>
              Phim phân loại nhãn T13: Khán giả từ đủ 13 tuổi trở lên mới được
              phép vào phòng chiếu.
            </span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="select-none">•</span>
            <span>
              Vé đã mua trực tuyến không thể hoàn trả, hủy bỏ hoặc thay đổi suất
              chiếu dưới mọi hình thức.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
