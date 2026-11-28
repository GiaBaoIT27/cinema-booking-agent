"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Armchair,
  Building2,
  CalendarClock,
  Clapperboard,
  Film,
  LogOut,
  Popcorn,
  ReceiptText,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useAuthStore } from "@/stores/use-auth-store";
import {
  canAccessAdmin,
  visibleSections,
  type AdminSection,
} from "../utils/admin-access";

const ICONS: Record<AdminSection["key"], typeof Film> = {
  movies: Film,
  showtimes: CalendarClock,
  cineplexes: Building2,
  auditoriums: Armchair,
  fnb: Popcorn,
  orders: ReceiptText,
  users: Users,
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isInitialized, initAuth, logout } =
    useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isInitialized, isAuthenticated, pathname, router]);

  if (!isInitialized || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[#9CA3AF]">
        Đang kiểm tra đăng nhập...
      </div>
    );
  }

  if (!canAccessAdmin(user)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <ShieldAlert className="text-red-500" size={40} />
        <h1 className="text-xl font-semibold">Bạn không có quyền vào trang quản trị</h1>
        <p className="max-w-md text-sm text-[#9CA3AF]">
          Tài khoản {user?.email} chưa được cấp quyền quản trị nào.
        </p>
        <Link href="/" className="rounded-lg bg-[#EF4444] px-4 py-2 text-sm font-medium">
          Về trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#080C15] text-white">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-[#1F2937] bg-[#0B0F19] md:flex">
        <Link href={visibleSections(user)[0]?.href ?? "/admin"} className="flex items-center gap-2 px-5 py-5 font-heading text-lg font-bold">
          <Clapperboard className="text-[#EF4444]" size={22} />
          Cinema Admin
        </Link>
        <nav className="flex-1 space-y-1 px-3">
          {visibleSections(user).map(({ key, href, label }) => {
            const Icon = ICONS[key];
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-[#EF4444]/15 font-medium text-[#F87171]"
                    : "text-[#9CA3AF] hover:bg-[#1F2937] hover:text-white"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[#1F2937] p-4 text-xs">
          <p className="truncate font-medium">{user?.fullName}</p>
          <p className="truncate text-[#6B7280]">{user?.roles.join(", ")}</p>
          <div className="mt-3 flex gap-3">
            <Link href="/" className="text-[#9CA3AF] hover:text-white">
              Về trang khách
            </Link>
            <button
              type="button"
              onClick={() => {
                logout();
                router.replace("/login");
              }}
              className="flex items-center gap-1 text-red-400 hover:text-red-300"
            >
              <LogOut size={12} /> Đăng xuất
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[#1F2937] px-4 py-3 md:hidden">
          <span className="flex items-center gap-2 font-semibold">
            <Clapperboard className="text-[#EF4444]" size={18} /> Cinema Admin
          </span>
          <button
            type="button"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            className="text-xs text-red-400"
          >
            Đăng xuất
          </button>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-[#1F2937] px-3 py-2 md:hidden">
          {visibleSections(user).map(({ key, href, label }) => (
            <Link
              key={key}
              href={href}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs ${
                pathname.startsWith(href) ? "bg-[#EF4444]/15 text-[#F87171]" : "text-[#9CA3AF]"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
