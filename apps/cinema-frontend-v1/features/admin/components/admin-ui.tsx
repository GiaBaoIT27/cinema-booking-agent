"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import type { MovieStatusType } from "@/features/movie/types/movie.type";
import { MOVIE_STATUS_LABEL } from "../utils/movie-form";

const STATUS_STYLE: Record<MovieStatusType, string> = {
  UPCOMING: "bg-amber-500/15 text-amber-300",
  SHOWING: "bg-emerald-500/15 text-emerald-300",
  ENDED: "bg-gray-500/20 text-gray-400",
};

export function MovieStatusBadge({ status }: { status: string }) {
  const key = status as MovieStatusType;
  return (
    <span
      className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${
        STATUS_STYLE[key] ?? "bg-gray-500/20 text-gray-400"
      }`}
    >
      {MOVIE_STATUS_LABEL[key] ?? status}
    </span>
  );
}

export function Field({
  label,
  required,
  error,
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-[13px] font-medium text-[#D1D5DB]">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
      {error && <span className="block text-xs text-red-500">{error}</span>}
    </label>
  );
}

export const inputClass = (error?: string) =>
  `h-10 w-full rounded-lg border bg-[#0B0F19] px-3 text-sm text-white outline-none transition placeholder:text-[#4B5563] focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]/30 ${
    error ? "border-red-500" : "border-[#1F2937] hover:border-[#374151]"
  }`;

export function Notice({
  kind,
  children,
}: {
  kind: "error" | "success";
  children: React.ReactNode;
}) {
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={`rounded-lg border px-4 py-3 text-sm ${
        kind === "error"
          ? "border-red-900/60 bg-red-950/40 text-red-300"
          : "border-emerald-900/60 bg-emerald-950/40 text-emerald-300"
      }`}
    >
      {children}
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-10" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className={`w-full ${wide ? "max-w-2xl" : "max-w-lg"} rounded-xl border border-[#1F2937] bg-[#0F1420] p-6 shadow-2xl`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="text-xl leading-none text-[#6B7280] hover:text-white" aria-label="Đóng">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Pager({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 text-sm">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} className="rounded-lg border border-[#374151] px-3 py-1.5 disabled:opacity-40">
        Trước
      </button>
      <span className="text-[#9CA3AF]">
        Trang {page}/{totalPages}
      </span>
      <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)} className="rounded-lg border border-[#374151] px-3 py-1.5 disabled:opacity-40">
        Sau
      </button>
    </div>
  );
}

export function Badge({ tone, children }: { tone: "green" | "amber" | "gray" | "red" | "blue"; children: React.ReactNode }) {
  const cls = {
    green: "bg-emerald-500/15 text-emerald-300",
    amber: "bg-amber-500/15 text-amber-300",
    gray: "bg-gray-500/20 text-gray-400",
    red: "bg-red-500/15 text-red-300",
    blue: "bg-sky-500/15 text-sky-300",
  }[tone];
  return <span className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

export const errorText = (err: unknown, fallback = "Thao tác thất bại") =>
  err instanceof Error && err.message ? err.message : fallback;

export const primaryBtn =
  "rounded-lg bg-[#EF4444] px-4 py-2 text-sm font-medium hover:bg-[#DC2626] disabled:opacity-60";
export const secondaryBtn =
  "rounded-lg border border-[#374151] px-4 py-2 text-sm hover:bg-[#1F2937] disabled:opacity-60";

/* ───────────── Thanh công cụ: lọc + thao tác trên cùng một hàng ───────────── */

const controlBase =
  "h-9 rounded-lg border border-[#1F2937] bg-[#0B0F19] px-3 text-sm text-white outline-none transition [color-scheme:dark] hover:border-[#374151] focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]/30";

/** Ô lọc (select/date) co theo nội dung — KHÔNG có w-full như inputClass của form. */
export const filterClass = `${controlBase} w-auto shrink-0`;

export function PageHeader({ title, subtitle }: { title: string; subtitle?: React.ReactNode }) {
  return (
    <div>
      <h1 className="font-heading text-2xl font-bold">{title}</h1>
      {subtitle && <p className="text-sm text-[#9CA3AF]">{subtitle}</p>}
    </div>
  );
}

/** Bộ lọc bên trái, nút thao tác (children của `actions`) dồn sang phải, cùng một hàng. */
export function Toolbar({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#1F2937] bg-[#0B0F19]/60 p-2">
      {children}
      {actions && <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Ô tìm kiếm tự lọc sau khi ngừng gõ 350ms (không cần nút “Tìm”). */
export function SearchBox({
  value,
  onSearch,
  placeholder,
}: {
  value: string;
  onSearch: (value: string) => void;
  placeholder: string;
}) {
  const [text, setText] = useState(value);
  // Bộ lọc bị đặt lại từ bên ngoài (nút “Xóa lọc”) → đồng bộ ô nhập theo giá trị mới
  const [synced, setSynced] = useState(value);
  if (synced !== value) {
    setSynced(value);
    setText(value);
  }

  useEffect(() => {
    if (text.trim() === value) return;
    const t = setTimeout(() => onSearch(text.trim()), 350);
    return () => clearTimeout(t);
  }, [text, value, onSearch]);

  return (
    <div className="relative min-w-52 flex-1">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`${controlBase} w-full pl-9`}
      />
    </div>
  );
}

export function ClearFilters({ show, onClear }: { show: boolean; onClear: () => void }) {
  if (!show) return null;
  return (
    <button type="button" onClick={onClear} className="shrink-0 px-2 text-xs text-[#9CA3AF] hover:text-white">
      Xóa lọc
    </button>
  );
}

export const toolbarBtn =
  "flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[#EF4444] px-3 text-sm font-medium hover:bg-[#DC2626] disabled:opacity-60";
