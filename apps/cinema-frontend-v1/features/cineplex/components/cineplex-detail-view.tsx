"use client";

import { useCineplexDetail } from "../hooks/use-cineplex-detail";
import { CineplexDetailHeader } from "./cineplex-detail-header";
import { CineplexMap } from "./cineplex-map";
import { CineplexShowtimes } from "./cineplex-showtimes";

export function CineplexDetailView({ id }: { id: number }) {
  const { data, isPending, isError, error, refetch } = useCineplexDetail(id);

  if (isPending) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-1/2 animate-pulse rounded bg-[#111827]" />
        <div className="h-64 animate-pulse rounded-2xl border border-[#1F2937] bg-[#111827]" />
      </div>
    );
  }

  if (isError) {
    return (
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
    );
  }

  return (
    <div className="space-y-8">
      <CineplexDetailHeader cineplex={data} />
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <CineplexShowtimes cineplexId={data.id} />
        <CineplexMap
          name={data.name}
          latitude={data.latitude}
          longitude={data.longitude}
        />
      </div>
    </div>
  );
}
