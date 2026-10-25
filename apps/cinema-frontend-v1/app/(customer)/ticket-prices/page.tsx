import { Ticket, Sparkles, Clock, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function TicketPricesPage() {
  const priceTiers = [
    {
      type: "STANDARD (Ghế Thường)",
      weekday: "75.000đ",
      weekend: "95.000đ",
      description: "Ghế ngồi thoải mái tại các hàng ghế tiêu chuẩn với góc nhìn tối ưu.",
      badge: "Phổ biến",
    },
    {
      type: "VIP (Ghế VIP)",
      weekday: "95.000đ",
      weekend: "115.000đ",
      description: "Vị trí trung tâm khán phòng, tầm nhìn bao quát toàn bộ màn hình lớn.",
      badge: "Trải nghiệm tốt nhất",
    },
    {
      type: "SWEETBOX (Ghế Đôi)",
      weekday: "180.000đ",
      weekend: "220.000đ",
      description: "Không gian riêng tư cho các cặp đôi với vách ngăn cao và ghế nệm êm ái.",
      badge: "Dành cho cặp đôi",
    },
  ];

  return (
    <div className="min-h-screen bg-[#080C15] pb-20 text-white">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">
        <div className="border-b border-[#1F2937] pb-6">
          <h1 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
            BẢNG GIÁ VÉ TIÊU CHUẨN
          </h1>
          <p className="mt-1 text-xs text-[#9CA3AF] sm:text-sm">
            Áp dụng cho tất cả các cụm rạp trên toàn hệ thống Cinema Booking.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {priceTiers.map((tier, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-2xl border border-[#1F2937] bg-[#111827] p-6 shadow-lg transition hover:border-[#EF4444]/40"
            >
              <div className="space-y-4">
                <span className="inline-block rounded-full bg-[#EF4444]/10 px-3 py-1 text-[11px] font-bold text-[#EF4444]">
                  {tier.badge}
                </span>
                <h3 className="text-lg font-bold text-white">{tier.type}</h3>
                <p className="text-xs text-[#9CA3AF]">{tier.description}</p>
                <div className="border-t border-[#1F2937] pt-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#9CA3AF]">Thứ 2 - Thứ 5:</span>
                    <span className="font-bold text-white">{tier.weekday}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#9CA3AF]">Thứ 6, 7, CN & Lễ:</span>
                    <span className="font-bold text-[#F59E0B]">{tier.weekend}</span>
                  </div>
                </div>
              </div>

              <Link
                href="/movies"
                className="mt-6 block text-center rounded-lg bg-[#EF4444] py-2.5 text-xs font-bold text-white transition hover:bg-[#F87171]"
              >
                Đặt Vé Ngay
              </Link>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-[#1F2937] bg-[#111827]/50 p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <ShieldCheck size={18} className="text-[#10B981]" />
            Chính sách & Quy định vé
          </div>
          <ul className="list-inside list-disc text-xs text-[#9CA3AF] space-y-1">
            <li>Giá vé đã bao gồm thuế VAT theo quy định pháp luật.</li>
            <li>Vé đã thanh toán thành công không hỗ trợ hoàn tiền hoặc đổi suất chiếu trực tiếp qua mạng.</li>
            <li>Trẻ em dưới 0.7m được miễn phí vé khi ngồi cùng người lớn.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

