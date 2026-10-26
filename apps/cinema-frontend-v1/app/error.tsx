"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled client error caught by ErrorBoundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-rose-500/20 bg-rose-500/10 text-rose-500 shadow-xl shadow-rose-500/10">
        <AlertTriangle size={36} />
      </div>

      <h1 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
        Đã có sự cố xảy ra
      </h1>

      <p className="mt-2 max-w-md text-sm text-[#9CA3AF] leading-relaxed">
        Hệ thống không thể tải dữ liệu trang này. Xin lỗi vì sự bất tiện này, bạn có thể thử tải lại hoặc quay về trang chủ.
      </p>

      {error.digest && (
        <p className="mt-2 font-mono text-[11px] text-[#6B7280]">
          Mã lỗi: {error.digest}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="flex h-11 items-center gap-2 rounded-xl bg-[#EF4444] px-5 text-sm font-bold text-white shadow-lg shadow-red-500/25 transition hover:bg-[#DC2626] cursor-pointer"
        >
          <RefreshCw size={16} />
          Thử Lại
        </button>

        <Link
          href="/"
          className="flex h-11 items-center gap-2 rounded-xl border border-[#374151] bg-[#111827] px-5 text-sm font-bold text-[#E5E7EB] transition hover:border-white hover:text-white"
        >
          <Home size={16} />
          Trang Chủ
        </Link>
      </div>
    </div>
  );
}

