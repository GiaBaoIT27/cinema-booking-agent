"use client";

import { useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin, Search } from "lucide-react";
import { useUserLocation } from "../hooks/use-user-location";
import type {
  CineplexListParams,
  CineplexStatusFilter,
} from "../types/cineplex.types";

interface Props {
  filters: CineplexListParams;
  onChange: (patch: Partial<CineplexListParams>) => void;
}

const STATUS_OPTIONS: { value: CineplexStatusFilter; label: string }[] = [
  { value: "ACTIVE", label: "Đang hoạt động" },
  { value: "MAINTENANCE", label: "Bảo trì" },
  { value: "CLOSED", label: "Đã đóng cửa" },
  { value: "ALL", label: "Tất cả" },
];

const RADIUS_OPTIONS = [5, 10, 20, 50];

const CONTROL =
  "h-11 rounded-xl border border-[#1F2937] bg-[#111827] text-sm text-white outline-none transition focus:border-[#EF4444]";

export function CineplexFilters({ filters, onChange }: Props) {
  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { status: locationStatus, request } = useUserLocation();

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const hasLocation =
    filters.latitude !== undefined && filters.longitude !== undefined;

  const handleSearch = (value: string) => {
    setSearchInput(value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(
      () => onChange({ search: value.trim() || undefined }),
      400,
    );
  };

  const toggleNearMe = () => {
    if (hasLocation) {
      onChange({
        latitude: undefined,
        longitude: undefined,
        radiusKm: undefined,
      });
      return;
    }
    request((loc) => onChange({ ...loc, radiusKm: filters.radiusKm ?? 10 }));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280]"
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc địa chỉ rạp..."
            className={`${CONTROL} w-full pl-10 pr-3 placeholder:text-[#6B7280]`}
          />
        </div>

        <select
          value={filters.status ?? "ACTIVE"}
          onChange={(e) =>
            onChange({ status: e.target.value as CineplexStatusFilter })
          }
          className={`${CONTROL} px-3`}
          aria-label="Trạng thái rạp"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className="bg-[#111827]">
              {o.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={toggleNearMe}
          disabled={locationStatus === "loading"}
          className={`flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition disabled:opacity-60 ${
            hasLocation
              ? "border-[#EF4444] bg-[#EF4444] text-white"
              : "border-[#1F2937] bg-[#111827] text-white hover:border-[#EF4444]/60"
          }`}
        >
          {locationStatus === "loading" ? (
            <LocateFixed size={16} className="animate-pulse" />
          ) : (
            <MapPin size={16} />
          )}
          {locationStatus === "loading"
            ? "Đang định vị..."
            : hasLocation
              ? "Tắt tìm gần tôi"
              : "Rạp gần tôi"}
        </button>
      </div>

      {hasLocation && (
        <div className="flex items-center gap-2 text-sm text-[#9CA3AF]">
          <span>Bán kính:</span>
          <select
            value={filters.radiusKm ?? 10}
            onChange={(e) => onChange({ radiusKm: Number(e.target.value) })}
            className="h-9 rounded-lg border border-[#1F2937] bg-[#111827] px-2 text-sm text-white outline-none focus:border-[#EF4444]"
          >
            {RADIUS_OPTIONS.map((r) => (
              <option key={r} value={r} className="bg-[#111827]">
                {r} km
              </option>
            ))}
          </select>
        </div>
      )}

      {locationStatus === "denied" && (
        <p className="text-sm text-amber-400">
          Bạn đã từ chối quyền vị trí. Hãy cấp quyền trong trình duyệt để tìm
          rạp gần bạn.
        </p>
      )}
      {locationStatus === "error" && (
        <p className="text-sm text-rose-400">
          Không thể xác định vị trí hiện tại.
        </p>
      )}
    </div>
  );
}
