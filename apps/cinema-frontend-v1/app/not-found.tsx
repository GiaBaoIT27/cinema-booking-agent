import Link from "next/link";
import { Film, Home } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-3xl border border-[#1F2937] bg-[#111827] text-[#EF4444] shadow-2xl">
        <Film size={44} className="stroke-1" />
        <span className="absolute -top-2 -right-2 rounded-full bg-[#EF4444] px-2.5 py-0.5 text-xs font-black text-white">
          404
        </span>
      </div>

      <h1 className="text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
        Không tìm thấy trang
      </h1>

      <p className="mt-2 max-w-md text-sm text-[#9CA3AF] leading-relaxed">
        Trang bạn đang tìm kiếm có thể đã bị dỡ bỏ, đổi tên hoặc tạm thời không khả dụng.
      </p>

      <div className="mt-8 flex items-center justify-center gap-3">
        <Link
          href="/"
          className="flex h-11 items-center gap-2 rounded-xl bg-[#EF4444] px-6 text-sm font-bold text-white shadow-lg shadow-red-500/25 transition hover:bg-[#DC2626]"
        >
          <Home size={16} />
          Về Trang Chủ
        </Link>
      </div>
    </div>
  );
}

