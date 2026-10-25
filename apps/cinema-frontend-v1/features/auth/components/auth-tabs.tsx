"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AuthTabs() {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  return (
    <div className="mb-8 grid grid-cols-2 border-b border-[#1F2937]">
      {/* Tab Đăng nhập */}
      <Link
        href="/login"
        className={`
          relative
          pb-4
          text-center
          text-[16px]
          font-semibold
          transition-colors
          ${isLogin ? "text-white" : "text-[#6B7280] hover:text-white"}
        `}
      >
        Đăng nhập
        {isLogin && (
          <span className="absolute -bottom-px left-0 h-0.5 w-full bg-[#EF4444]" />
        )}
      </Link>

      {/* Tab Đăng ký */}
      <Link
        href="/register"
        className={`
          relative
          pb-4
          text-center
          text-[16px]
          font-medium
          transition-colors
          ${!isLogin ? "text-white" : "text-[#6B7280] hover:text-white"}
        `}
      >
        Đăng ký
        {!isLogin && (
          <span className="absolute -bottom-px left-0 h-0.5 w-full bg-[#EF4444]" />
        )}
      </Link>
    </div>
  );
}
