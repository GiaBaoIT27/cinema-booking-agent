"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCineplexShowtimes } from "../hooks/use-cineplex-showtimes";
import type {
  CineplexMovieShowtimeGroup,
  CineplexShowtimeItem,
} from "../types/cineplex.types";
import { formatTime, getNextDays } from "../utils/cineplex.utils";
import { Film } from "lucide-react";

interface Props {
  cineplexId: number;
  /** Lọc theo một phim (tuỳ chọn), map sang query movieId. */
  movieId?: string;
  onSelectShowtime?: (showtime: CineplexShowtimeItem) => void;
}

function normalizeGroups(raw: unknown): CineplexMovieShowtimeGroup[] {
  if (!Array.isArray(raw)) return [];

  const groups: CineplexMovieShowtimeGroup[] = [];

  for (const item of raw) {
    if (!item) continue;

    // Trường hợp 1: Backend trả về group sẵn: { movieId, movieTitle, posterUrl, showtimes: [...] }
    if ("movieId" in item && Array.isArray((item as any).showtimes)) {
      const g = item as CineplexMovieShowtimeGroup;
      groups.push({
        movieId: g.movieId,
        movieTitle: g.movieTitle || "Phim chưa đặt tên",
        posterUrl: g.posterUrl ?? null,
        durationMinutes: g.durationMinutes || 0,
        ageRating: g.ageRating ?? null,
        showtimes: [...g.showtimes].sort((a, b) =>
          String(a.startTime).localeCompare(String(b.startTime)),
        ),
      });
      continue;
    }

    // Trường hợp 2: Flat item với s.movie: { movie: { id, title }, startTime }
    if ((item as any).movie && typeof (item as any).movie === "object") {
      const m = (item as any).movie;
      const existing = groups.find((g) => g.movieId === m.id);
      const showtimeItem: CineplexShowtimeItem = {
        showtimeId: (item as any).id || (item as any).showtimeId,
        auditoriumId: (item as any).auditoriumId || 0,
        auditoriumName:
          (item as any).roomName || (item as any).auditoriumName || "",
        projectionType: (item as any).projectionType,
        startTime: (item as any).startTime,
        endTime: (item as any).endTime || (item as any).startTime,
        status: (item as any).status,
      };

      if (existing) {
        existing.showtimes.push(showtimeItem);
      } else {
        groups.push({
          movieId: m.id,
          movieTitle: m.title || "",
          posterUrl: m.posterUrl ?? null,
          durationMinutes: 0,
          ageRating: null,
          showtimes: [showtimeItem],
        });
      }
    }
  }

  return groups;
}

/**
 * Hiển thị lịch chiếu theo ngày của cụm rạp.
 */
export function CineplexShowtimes({
  cineplexId,
  movieId,
  onSelectShowtime,
}: Props) {
  const days = useMemo(() => getNextDays(7), []);
  const [date, setDate] = useState(days[0].key);
  const { data, isPending, isError, error, refetch } = useCineplexShowtimes(
    cineplexId,
    { date, movieId },
  );

  const groups = useMemo(() => normalizeGroups(data), [data]);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold uppercase tracking-tight text-white">
          LỊCH CHIẾU THEO RẠP
        </h2>
      </div>

      {/* Thanh chọn ngày */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {days.map((d) => {
          const isSelected = d.key === date;
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => setDate(d.key)}
              className={`flex min-w-[76px] shrink-0 flex-col items-center rounded-xl border p-2.5 text-xs font-semibold transition cursor-pointer ${
                isSelected
                  ? "border-[#EF4444] bg-[#EF4444] text-white shadow-lg shadow-red-500/20"
                  : "border-[#1F2937] bg-[#111827] text-[#9CA3AF] hover:border-[#374151] hover:text-white"
              }`}
            >
              <span className="text-[11px] opacity-80">{d.weekday}</span>
              <span className="text-sm font-bold mt-0.5">{d.label}</span>
            </button>
          );
        })}
      </div>

      {isPending && (
        <div className="space-y-4">
          <div className="h-28 animate-pulse rounded-2xl bg-[#111827] border border-[#1F2937]" />
          <div className="h-28 animate-pulse rounded-2xl bg-[#111827] border border-[#1F2937]" />
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 text-center">
          <p className="text-sm text-rose-400 font-medium">
            {error?.message || "Không thể tải lịch chiếu của rạp."}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 rounded-lg bg-[#1F2937] px-4 py-2 text-xs font-bold text-white hover:bg-[#374151] transition cursor-pointer"
          >
            Thử Lại
          </button>
        </div>
      )}

      {!isPending && !isError && groups.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#1F2937] bg-[#111827]/40 py-16 text-center">
          <Film size={40} className="text-[#4B5563] mb-3 stroke-1" />
          <p className="text-sm font-semibold text-white">
            Chưa có suất chiếu trong ngày này
          </p>
          <p className="text-xs text-[#9CA3AF] mt-1">
            Vui lòng chọn ngày khác hoặc quay lại sau để cập nhật lịch mới nhất.
          </p>
        </div>
      )}

      {/* Danh sách phim & suất chiếu */}
      <div className="space-y-4">
        {groups.map((group) => (
          <div
            key={group.movieId}
            className="flex flex-col gap-4 rounded-2xl border border-[#1F2937] bg-[#111827] p-5 sm:flex-row sm:items-start"
          >
            {/* Poster phim */}
            <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-[#1F2937] border border-[#374151]/40">
              {group.posterUrl ? (
                <Image
                  src={group.posterUrl}
                  alt={group.movieTitle}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[#4B5563]">
                  <Film size={24} />
                </div>
              )}
            </div>

            {/* Thông tin phim & suất chiếu */}
            <div className="flex-1 space-y-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white hover:text-[#EF4444] transition">
                    <Link href={`/movies/${group.movieId}`}>
                      {group.movieTitle}
                    </Link>
                  </h3>
                  {group.ageRating && (
                    <span className="rounded bg-[#EF4444]/20 px-2 py-0.5 text-[10px] font-bold text-[#EF4444]">
                      {group.ageRating}
                    </span>
                  )}
                </div>
                {group.durationMinutes > 0 && (
                  <p className="text-xs text-[#9CA3AF] mt-0.5">
                    {group.durationMinutes} phút
                  </p>
                )}
              </div>

              {/* Các nút giờ chiếu */}
              <div className="flex flex-wrap gap-2.5">
                {group.showtimes.map((s) => {
                  const href = `/booking/seat-selection?showtimeId=${s.showtimeId}`;
                  return (
                    <Link
                      key={s.showtimeId}
                      href={href}
                      onClick={() => onSelectShowtime?.(s)}
                      className="group flex flex-col items-center justify-center rounded-xl border border-[#1F2937] bg-[#080C15] px-3.5 py-2 transition hover:border-[#EF4444] hover:bg-[#EF4444]/10"
                    >
                      <span className="font-mono text-sm font-bold text-white group-hover:text-[#EF4444]">
                        {formatTime(s.startTime)}
                      </span>
                      {s.auditoriumName && (
                        <span className="text-[10px] text-[#9CA3AF] group-hover:text-white mt-0.5">
                          {s.auditoriumName}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
