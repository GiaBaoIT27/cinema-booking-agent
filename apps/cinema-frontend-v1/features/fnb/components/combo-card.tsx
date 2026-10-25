"use client";
import { useState } from "react";

import Image from "next/image";
import { Minus, Plus, UtensilsCrossed } from "lucide-react";

export interface ComboItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  badge?: string;
}

interface ComboCardProps {
  combo: ComboItem;
  quantity: number;
  onIncrease: (id: string) => void;
  onDecrease: (id: string) => void;
}

export function ComboCard({
  combo,
  quantity,
  onIncrease,
  onDecrease,
}: ComboCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageSrc = combo.imageUrl && !imageFailed ? combo.imageUrl : null;

  return (
    <div className="relative flex overflow-hidden rounded-xl border border-[#1F2937] bg-[#111827] p-3.5 transition hover:border-[#374151]">
      {/* Ribbon Badge (Nếu có) */}
      {combo.badge && (
        <div className="absolute -left-8 top-3 z-10 w-28 -rotate-45 bg-[#EF4444] py-0.5 text-center text-[9px] font-black uppercase tracking-tighter text-white shadow-md">
          {combo.badge}
        </div>
      )}

      {/* Ảnh Combo (Trái) */}
      <div className="relative aspect-square w-28 shrink-0 overflow-hidden rounded-lg bg-[#0B0F19]">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={combo.name}
            fill
            loading="eager"
            onError={() => setImageFailed(true)}
            className="object-contain p-1"
            sizes="112px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#374151]">
            <UtensilsCrossed size={32} />
          </div>
        )}
      </div>

      {/* Thông tin Combo (Phải) */}
      <div className="ml-3.5 flex flex-1 flex-col justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-black uppercase tracking-tight text-white">
            {combo.name}
          </h3>
          <p className="text-[11px] leading-4 text-[#9CA3AF] line-clamp-2">
            {combo.description}
          </p>
          <p className="pt-1 text-sm font-extrabold text-[#F59E0B]">
            {combo.price.toLocaleString("vi-VN")} VNĐ
          </p>
        </div>

        {/* Nút tăng/giảm số lượng */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => onDecrease(combo.id)}
            disabled={quantity === 0}
            className="flex h-7 w-7 items-center justify-center rounded bg-[#1F2937] text-white transition hover:bg-[#374151] disabled:opacity-30 disabled:hover:bg-[#1F2937]"
          >
            <Minus size={14} />
          </button>

          <span className="w-6 text-center font-mono text-sm font-bold text-white">
            {quantity}
          </span>

          <button
            type="button"
            onClick={() => onIncrease(combo.id)}
            className="flex h-7 w-7 items-center justify-center rounded bg-[#EF4444] text-white transition hover:bg-[#F87171] active:scale-95"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
