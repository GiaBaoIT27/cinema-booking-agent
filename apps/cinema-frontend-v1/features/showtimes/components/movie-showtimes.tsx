"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { MapPin, ChevronDown } from "lucide-react";

import { useMovieShowtimes } from "@/features/movie";
import {
  buildDateOptions,
  getProjectionLabel,
  toCinemaViews,
} from "../utils/showtimes-adapter";

interface MovieShowtimesProps {
  movieId: string | number;
}

export function MovieShowtimes({ movieId }: MovieShowtimesProps) {
  // 7 ngày: hôm nay + 6 ngày tiếp theo
  const dates = useMemo(() => buildDateOptions(), []);
  const [selectedDate, setSelectedDate] = useState<string>(dates[0].fullDate);
  const [selectedLocation, setSelectedLocation] =
    useState<string>("Hồ Chí Minh");

  const { showtimesData, isLoading, error, refetch } = useMovieShowtimes(
    movieId,
    { date: selectedDate },
  );

  const cinemas = useMemo(
    () => toCinemaViews(showtimesData?.showtimesByCinema ?? []),
    [showtimesData],
  );

  return (
    <div id="showtimes-section" className="space-y-10">
      {/* 1. LỊCH CHIẾU (DATE PICKER) */}
      <div className="space-y-4 text-center">
        <h2 className="text-lg font-bold uppercase tracking-wider text-white">
          Lịch Chiếu
        </h2>
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {dates.map((item) => {
            const isSelected = selectedDate === item.fullDate;
            return (
              <button
                key={item.fullDate}
                type="button"
                onClick={() => setSelectedDate(item.fullDate)}
                className={`flex flex-col items-center justify-center rounded-lg border px-4 py-2.5 transition min-w-21.25 ${
                  isSelected
                    ? "border-[#EF4444] bg-[#EF4444] text-white"
                    : "border-[#1F2937] bg-[#111827] text-[#9CA3AF] hover:border-[#374151] hover:text-white"
                }`}
              >
                <span className="text-sm font-bold">{item.dayNumber}</span>
                <span className="text-[11px] opacity-80">{item.dayName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. DANH SÁCH RẠP & LỌC TỈNH THÀNH */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-[#1F2937] pb-4">
          <h2 className="text-lg font-bold uppercase tracking-wider text-white">
            Danh Sách Rạp
          </h2>

          {/* Filter Location Dropdown */}
          <div className="relative">
            <div className="flex h-10 items-center gap-1.5 rounded-md border border-[#374151] bg-[#111827] px-3 py-1.5 text-xs text-white">
              <MapPin size={14} className="text-[#EF4444]" />
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="bg-transparent font-medium outline-none cursor-pointer pr-4 appearance-none"
              >
                <option value="hcm" className="bg-[#111827]">
                  Hồ Chí Minh
                </option>
                <option value="hn" className="bg-[#111827]">
                  Hà Nội
                </option>
                <option value="dn" className="bg-[#111827]">
                  Đà Nẵng
                </option>
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2 text-[#6B7280]"
              />
            </div>
          </div>
        </div>

        {/* 2. SUẤT CHIẾU */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, idx) => (
                <div
                  key={idx}
                  className="animate-pulse space-y-4 rounded-xl border border-[#1F2937] bg-[#111827] p-5"
                >
                  <div className="h-4 w-1/3 rounded bg-[#1F2937]" />
                  <div className="flex gap-2.5">
                    <div className="h-9 w-19 rounded bg-[#1F2937]" />
                    <div className="h-9 w-19 rounded bg-[#1F2937]" />
                    <div className="h-9 w-19 rounded bg-[#1F2937]" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
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
          ) : cinemas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#1F2937] py-12 text-center text-sm text-[#9CA3AF]">
              Chưa có suất chiếu nào trong ngày này.
            </div>
          ) : (
            <div className="space-y-4">
              {cinemas.map((cinema) => (
                <div
                  key={cinema.id}
                  className="space-y-4 rounded-xl border border-[#1F2937] bg-[#111827] p-5"
                >
                  {/* Cinema Info */}
                  <h3 className="text-base font-bold text-white">
                    {cinema.name}
                  </h3>

                  {/* Showtimes theo định dạng chiếu */}
                  {cinema.groups.map((group, index) => {
                    const isStandard = group.projectionType === "2D";
                    return (
                      <div
                        key={group.projectionType}
                        className={`space-y-2 pt-2 ${
                          index > 0 ? "border-t border-[#1F2937]/60" : ""
                        }`}
                      >
                        <span
                          className={`block text-[11px] font-bold uppercase tracking-wider ${
                            isStandard ? "text-[#9CA3AF]" : "text-amber-500"
                          }`}
                        >
                          {getProjectionLabel(group.projectionType)}
                        </span>
                        <div className="flex flex-wrap gap-2.5">
                          {group.slots.map((st) => (
                            <Link
                              key={st.id}
                              href={`/booking/seat-selection?showtimeId=${st.id}`}
                              title={st.auditoriumName}
                              className={
                                isStandard
                                  ? "flex h-9 min-w-19 items-center justify-center rounded-md border border-[#374151] bg-[#0B0F19] text-xs font-semibold text-white transition hover:border-[#EF4444] hover:bg-[#EF4444] hover:text-white"
                                  : "flex h-9 min-w-19 items-center justify-center rounded-md border border-amber-500/40 bg-[#0B0F19] text-xs font-semibold text-amber-400 transition hover:bg-amber-500 hover:text-black"
                              }
                            >
                              {st.time}
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
