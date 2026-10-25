"use client";

import dynamic from "next/dynamic";
import { buildDirectionsUrl } from "../utils/cineplex.utils";
import { Navigation } from "lucide-react";

// Import động component Bản đồ Leaflet và tắt SSR
const LeafletMapClient = dynamic(() => import("./osm-map"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full bg-[#111827] animate-pulse rounded-2xl border border-[#1F2937]" />
  ),
});

interface Props {
  name: string;
  latitude: number | null;
  longitude: number | null;
}

export function CineplexMap({ name, latitude, longitude }: Props) {
  if (latitude === null || longitude === null) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-[#1F2937] bg-[#111827]/40 text-xs text-[#9CA3AF]">
        Chưa có toạ độ vị trí cho cụm rạp này.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-tight text-white">
          Vị Trí Rạp
        </h3>
      </div>

      <LeafletMapClient lat={latitude} lng={longitude} name={name} />

      <a
        href={buildDirectionsUrl(latitude, longitude)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#EF4444] px-4 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#F87171] active:scale-[0.98]"
      >
        <Navigation size={14} />
        Xem Chỉ Đường Google Maps
      </a>
    </div>
  );
}
