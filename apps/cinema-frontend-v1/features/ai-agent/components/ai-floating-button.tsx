"use client";

import { Sparkles } from "lucide-react";

interface AIFloatingButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

export function AIFloatingButton({ onClick, isOpen }: AIFloatingButtonProps) {
  if (isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 group">
      {/* Tooltip hint on hover */}
      <div className="pointer-events-none absolute bottom-full right-0 mb-3 hidden sm:group-hover:flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#EF4444]/40 bg-[#111827]/95 px-3 py-1.5 text-xs font-semibold text-white shadow-xl backdrop-blur-md transition">
        <span>Trò chuyện với Trợ lý AI</span>
        <span className="text-[#F59E0B]">✨</span>
      </div>

      <button
        type="button"
        onClick={onClick}
        aria-label="Mở Trợ lý AI Đặt vé"
        className="relative flex h-14 items-center gap-2.5 rounded-full border border-red-500/40 bg-linear-to-r from-[#EF4444] via-[#DC2626] to-[#991B1B] px-4 sm:px-5 text-white shadow-[0_10px_30px_rgba(239,68,68,0.45)] transition duration-300 hover:scale-105 active:scale-95"
      >
        {/* Glow halo animation */}
        <span className="absolute -inset-1 rounded-full bg-linear-to-r from-red-600 via-pink-600 to-amber-600 opacity-30 blur-md group-hover:opacity-60 transition duration-500 animate-pulse" />

        <div className="relative flex items-center justify-center">
          <Sparkles
            size={20}
            className="animate-spin [animation-duration:6s]"
          />
        </div>

        <span className="relative hidden sm:inline text-xs font-black uppercase tracking-wider">
          AI Đặt Vé
        </span>

        {/* Live indicator dot */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
        </span>
      </button>
    </div>
  );
}
