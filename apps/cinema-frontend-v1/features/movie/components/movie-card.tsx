"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, Play } from "lucide-react";

export interface Movie {
  id: string;
  title: string;
  originalTitle?: string;
  posterUrl: string;
  ageRating: "P" | "K" | "T13" | "T16" | "T18";
  formats: string[]; // ["2D", "3D", "IMAX"]
  genres: string[];
  durationMinutes: number;
  releaseDate: string;
  rating: number; // e.g., 9.2
  status: "UPCOMING" | "SHOWING" | "SPECIAL";
  trailerUrl?: string | null;
}

interface MovieCardProps {
  movie: Movie;
  onOpenTrailer?: (movie: Movie) => void;
}

const AGE_RATING_COLORS: Record<string, string> = {
  P: "bg-emerald-600 text-white",
  K: "bg-blue-600 text-white",
  T13: "bg-amber-500 text-black font-extrabold",
  T16: "bg-orange-600 text-white",
  T18: "bg-red-600 text-white",
};

export function MovieCard({ movie, onOpenTrailer }: MovieCardProps) {
  return (
    <div className="group h-120 relative flex flex-col overflow-hidden rounded-xl border border-[#1F2937] bg-[#111827] transition-all duration-300 hover:-translate-y-1 hover:border-[#EF4444]/60 hover:shadow-xl hover:shadow-red-500/10">
      {/* Khung Poster Phim */}
      <div className="relative aspect-2/3 w-full overflow-hidden bg-[#0B0F19]">
        <Image
          src={movie.posterUrl}
          alt={movie.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />

        {/* Gradient Overlay khi Hover */}
        <div className="absolute inset-0 bg-linear-to-t from-[#111827] via-transparent to-black/30 opacity-80 group-hover:opacity-90" />

        {/* Badge Độ Tuổi & Định Dạng (Góc Trên) */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
          <span
            className={`rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
              AGE_RATING_COLORS[movie.ageRating] || "bg-gray-700 text-white"
            }`}
          >
            {movie.ageRating}
          </span>
          {movie.formats.map((fmt) => (
            <span
              key={fmt}
              className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-slate-200 backdrop-blur-sm"
            >
              {fmt}
            </span>
          ))}
        </div>

        {/* Điểm Đánh Giá (Góc Trên Phải) */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 rounded-full bg-black/75 px-2 py-0.5 text-[11px] font-extrabold text-[#F59E0B] backdrop-blur-sm">
          <Star size={12} className="fill-[#F59E0B]" />
          <span>{movie.rating.toFixed(1)}</span>
        </div>

        {/* Nút Xem Trailer Nổi khi Hover */}
        {onOpenTrailer && (
          <button
            type="button"
            onClick={() => onOpenTrailer(movie)}
            className="absolute inset-0 m-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EF4444]/90 text-white opacity-0 shadow-lg backdrop-blur transition-all duration-300 group-hover:opacity-100 group-hover:scale-110"
            title="Xem Trailer"
          >
            <Play size={20} className="ml-0.5 fill-white" />
          </button>
        )}
      </div>

      {/* Thông tin Chi Tiết Phim */}
      <div className="flex flex-1 flex-col justify-between p-4 space-y-3">
        <div className="space-y-1.5">
          <Link href={`/movies/${movie.id}`}>
            <h3 className="mb-2 line-clamp-1 text-base font-black uppercase tracking-tight text-white group-hover:text-[#EF4444] transition-colors cursor-pointer">
              {movie.title}
            </h3>
          </Link>

          {/* Thể loại */}
          <p className="line-clamp-1 text-xs text-[#9CA3AF]">
            Thể loại: {movie.genres.join(", ")}
          </p>

          <p className="line-clamp-1 text-xs text-[#9CA3AF]">
            Thời lượng: {movie.durationMinutes} phút
          </p>
          <p className="line-clamp-1 text-xs text-[#9CA3AF]">
            Khởi chiếu: {movie.releaseDate}
          </p>
        </div>

        {/* Nút Đặt Vé / Chi Tiết */}
        <div className="pt-1">
          {movie.status === "UPCOMING" ? (
            <Link
              href={`/movies/${movie.id}`}
              className="flex h-9 w-full items-center justify-center rounded-lg border border-[#374151] bg-[#1F2937] text-xs font-bold uppercase text-slate-200 transition hover:bg-[#374151]"
            >
              Xem Chi Tiết
            </Link>
          ) : (
            <Link
              href={`/booking/seat-selection?movieId=${movie.id}`}
              className="flex h-9 w-full items-center justify-center rounded-lg bg-[#EF4444] text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#F87171] active:scale-[0.98]"
            >
              MUA VÉ
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
