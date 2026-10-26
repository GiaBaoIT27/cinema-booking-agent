"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, User as UserIcon, Search } from "lucide-react";
import { useAuthStore } from "@/stores/use-auth-store";
import { useMounted } from "@/hooks/use-mounted";

export function HeaderActions() {
  const { user, isAuthenticated, logout, initAuth } = useAuthStore();
  const mounted = useMounted();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <div className="ml-auto flex items-center gap-6">
      {/* Search */}
      <button
        type="button"
        className="hidden items-center gap-2 transition-colors hover:text-white md:flex"
      >
        <Search size={16} />
        <span className="text-[12px] text-[#9EA3AF]">Tìm kiếm phim...</span>
      </button>

      {/* Language */}
      <div className="hidden items-center gap-2 text-[11px] sm:flex">
        <button type="button" className="font-medium text-[#F04449]">
          VN
        </button>

        <span className="text-[#4B505A]">|</span>

        <button
          type="button"
          className="text-[#858A95] transition hover:text-white"
        >
          EN
        </button>
      </div>

      {/* Auth state: Client-side hydrated */}
      {mounted && isAuthenticated && user ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="
              flex
              h-9
              items-center
              gap-2
              rounded-lg
              border
              border-[#374151]
              bg-[#1F2937]
              px-3
              text-[13px]
              font-medium
              text-white
              transition
              hover:border-[#4B5563]
              hover:bg-[#374151]
            "
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#EF4444] text-[11px] font-bold text-white">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
            </div>
            <span className="max-w-30 truncate text-[13px]">
              {user.fullName || user.email}
            </span>
          </button>

          {/* User Dropdown Menu */}
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-11 z-50 w-52 rounded-xl border border-[#1F2937] bg-[#111827] p-2 shadow-2xl animate-in fade-in zoom-in-95">
                <div className="border-b border-[#1F2937] px-3 py-2 text-[12px]">
                  <p className="font-semibold text-white truncate">
                    {user.fullName}
                  </p>
                  <p className="text-[11px] text-[#9CA3AF] truncate">
                    {user.email}
                  </p>
                  {user.roles && user.roles.length > 0 && (
                    <span className="mt-1 inline-block rounded bg-red-950/60 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
                      {user.roles.join(", ")}
                    </span>
                  )}
                </div>

                <div className="py-1">
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-[#D1D5DB] hover:bg-[#1F2937] hover:text-white transition"
                  >
                    <UserIcon size={16} />
                    Thông tin cá nhân
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-red-400 hover:bg-red-950/30 hover:text-red-300 transition"
                  >
                    <LogOut size={16} />
                    Đăng xuất
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <Link
          href="/login"
          className="
            inline-flex
            h-9
            items-center
            justify-center
            rounded-lg
            bg-[#EF4444]
            px-4
            text-[12px]
            font-semibold
            text-white
            transition
            hover:bg-[#F87171]
          "
        >
          Đăng nhập
        </Link>
      )}
    </div>
  );
}
