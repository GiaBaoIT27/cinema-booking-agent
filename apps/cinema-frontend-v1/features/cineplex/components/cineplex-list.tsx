"use client";

import { MapPin } from "lucide-react";
import { useCineplexFilters } from "../hooks/use-cineplex-filters";
import { useCineplexes } from "../hooks/use-cineplexes";
import { CineplexCard } from "./cineplex-card";
import { CineplexFilters } from "./cineplex-filters";
import { CineplexPagination } from "./cineplex-pagination";

function CardSkeleton() {
  return (
    <div className="h-36 animate-pulse rounded-2xl border border-[#1F2937] bg-[#111827]" />
  );
}

export function CineplexList() {
  const { filters, setFilters } = useCineplexFilters();
  const { data, isPending, isError, error, refetch, isPlaceholderData } =
    useCineplexes(filters);

  return (
    <div className="space-y-6">
      <CineplexFilters filters={filters} onChange={setFilters} />

      {isPending && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-center">
          <p className="text-sm font-medium text-rose-400">{error.message}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 cursor-pointer rounded-lg bg-[#1F2937] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#374151]"
          >
            Thử Lại
          </button>
        </div>
      )}

      {data && data.items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#1F2937] bg-[#111827]/40 py-16 text-center">
          <MapPin size={40} className="mb-3 stroke-1 text-[#4B5563]" />
          <p className="text-sm font-semibold text-white">
            Không tìm thấy rạp phù hợp
          </p>
          <p className="mt-1 text-xs text-[#9CA3AF]">
            Thử đổi từ khóa, trạng thái hoặc tăng bán kính tìm kiếm.
          </p>
        </div>
      )}

      {data && data.items.length > 0 && (
        <div
          className={`space-y-4 transition ${isPlaceholderData ? "opacity-60" : ""}`}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((cineplex) => (
              <CineplexCard key={cineplex.id} cineplex={cineplex} />
            ))}
          </div>
          <CineplexPagination
            pagination={data.pagination}
            onPageChange={(page) => setFilters({ page }, { resetPage: false })}
          />
        </div>
      )}
    </div>
  );
}
