import { Tag, Calendar } from "lucide-react";
import Link from "next/link";

export default function PromotionsPage() {
  const promotions = [
    {
      code: "WELCOME2026",
      title: "Ưu Đãi Thành Viên Mới",
      discount: "Giảm 20.000đ cho đơn hàng đầu tiên",
      validUntil: "31/12/2026",
      condition:
        "Áp dụng cho khách hàng đăng ký tài khoản mới và đặt vé trực tuyến.",
    },
    {
      code: "STUDENTDAY",
      title: "Thứ Tư Vui Vẻ - Đồng Giá 55K",
      discount: "Đồng giá vé 55.000đ mọi khung giờ",
      validUntil: "Mỗi thứ Tư hàng tuần",
      condition:
        "Áp dụng cho học sinh, sinh viên khi mua vé tại quầy hoặc online.",
    },
    {
      code: "COMBOPOP",
      title: "Combo Bắp Nước Tiết Kiệm",
      discount: "Giảm 15% khi mua kèm vé xem phim",
      validUntil: "Vô thời hạn",
      condition:
        "Tự động áp dụng tại bước chọn bắp nước trong quy trình đặt vé.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#080C15] pb-20 text-white">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">
        <div className="border-b border-[#1F2937] pb-6">
          <h1 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
            CHƯƠNG TRÌNH KHUYẾN MÃI
          </h1>
          <p className="mt-1 text-xs text-[#9CA3AF] sm:text-sm">
            Nhận ngay các ưu đãi hấp dẫn và mã giảm giá khi đặt vé tại Cinema.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {promotions.map((promo, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-2xl border border-[#1F2937] bg-[#111827] p-6 shadow-lg transition hover:border-[#EF4444]/40"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EF4444]/10 text-[#EF4444]">
                    <Tag size={20} />
                  </div>
                  <span className="rounded bg-[#1F2937] px-2.5 py-1 text-[11px] font-mono font-bold text-white">
                    {promo.code}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">
                  {promo.title}
                </h3>
                <p className="text-xs font-semibold text-[#10B981]">
                  {promo.discount}
                </p>
                <p className="text-xs text-[#9CA3AF]">{promo.condition}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280] border-t border-[#1F2937] pt-3">
                  <Calendar size={13} />
                  <span>HSD: {promo.validUntil}</span>
                </div>
              </div>

              <Link
                href="/movies"
                className="mt-6 block text-center rounded-lg bg-[#EF4444] py-2.5 text-xs font-bold text-white transition hover:bg-[#F87171]"
              >
                Sử Dụng Ngay
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
