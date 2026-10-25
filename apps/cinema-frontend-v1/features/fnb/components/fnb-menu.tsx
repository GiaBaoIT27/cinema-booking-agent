"use client";

import { useMemo, useState } from "react";

import { useFnbItems } from "../hooks/use-fnb-items";
import { groupFnbByCategory, toComboItem } from "../utils/fnb-adapter";
import type { FnbSelection } from "../types/fnb.type";
import { ComboCard } from "./combo-card";

interface FnbMenuProps {
  /** Gọi mỗi khi khách đổi số lượng; chỉ gồm các món có số lượng > 0 */
  onChange?: (selection: FnbSelection[]) => void;
}

export function FnbMenu({ onChange }: FnbMenuProps) {
  const { items, isLoading, error, refetch } = useFnbItems();
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const groups = useMemo(() => groupFnbByCategory(items), [items]);

  const updateQuantity = (id: string, delta: number) => {
    const next = { ...quantities };
    const quantity = Math.max(0, (next[id] ?? 0) + delta);
    if (quantity === 0) delete next[id];
    else next[id] = quantity;

    setQuantities(next);
    onChange?.(
      items
        .filter((item) => next[item.id])
        .map((item) => ({ item, quantity: next[item.id] })),
    );
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="flex animate-pulse gap-3.5 rounded-xl border border-[#1F2937] bg-[#111827] p-3.5"
          >
            <div className="h-28 w-28 shrink-0 rounded-lg bg-[#1F2937]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-[#1F2937]" />
              <div className="h-3 w-full rounded bg-[#1F2937]" />
              <div className="h-3 w-1/3 rounded bg-[#1F2937]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 rounded-xl border border-dashed border-[#1F2937] py-12 text-center">
        <p className="text-sm text-[#EF4444]">{error}</p>
        <button
          type="button"
          onClick={refetch}
          className="rounded-lg border border-[#374151] px-5 py-2 text-xs font-semibold text-white transition hover:border-[#EF4444] hover:bg-[#EF4444]"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#1F2937] py-12 text-center text-sm text-[#9CA3AF]">
        Hiện chưa có sản phẩm bắp nước nào.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.category} className="space-y-4">
          <h2 className="text-lg font-bold uppercase tracking-wider text-white">
            {group.label}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {group.items.map((item) => (
              <ComboCard
                key={item.id}
                combo={toComboItem(item)}
                quantity={quantities[item.id] ?? 0}
                onIncrease={(id) => updateQuantity(id, 1)}
                onDecrease={(id) => updateQuantity(id, -1)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
