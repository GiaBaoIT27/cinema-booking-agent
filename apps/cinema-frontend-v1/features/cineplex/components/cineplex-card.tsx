import Link from "next/link";
import { MapPin, Phone } from "lucide-react";
import type { CineplexListItem } from "../types/cineplex.types";
import { formatDistance } from "../utils/cineplex.utils";
import { CineplexStatusBadge } from "./cineplex-status-badge";

export function CineplexCard({ cineplex }: { cineplex: CineplexListItem }) {
  return (
    <Link
      href={`/cineplexes/${cineplex.id}`}
      className="group flex flex-col gap-3 rounded-2xl border border-[#1F2937] bg-[#111827] p-5 transition hover:border-[#EF4444]/60 hover:bg-[#151E2F]"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-bold leading-snug text-white transition group-hover:text-[#EF4444]">
          {cineplex.name}
        </h3>
        {cineplex.distanceKm !== null && (
          <span className="shrink-0 rounded-full bg-[#EF4444]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#F87171]">
            {formatDistance(cineplex.distanceKm)}
          </span>
        )}
      </div>

      <p className="flex items-start gap-2 text-sm text-[#9CA3AF]">
        <MapPin size={15} className="mt-0.5 shrink-0" />
        <span>{cineplex.address}</span>
      </p>

      <div className="mt-auto flex items-center justify-between border-t border-[#1F2937] pt-3 text-sm text-[#9CA3AF]">
        <span className="flex items-center gap-2">
          <Phone size={14} className="shrink-0" />
          {cineplex.phoneNumber ?? "Chưa có số điện thoại"}
        </span>
        <CineplexStatusBadge status={cineplex.status} />
      </div>
    </Link>
  );
}
