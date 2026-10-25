"use client";

import Image from "next/image";
import { Play } from "lucide-react";

interface MovieDetailHeroProps {
  movie: {
    title: string;
    posterUrl: string;
    format: string;
    genre: string;
    duration: number;
    country: string;
    ageRating: string;
    releaseDate: string;
    director: string;
    cast: string;
  };
  onScrollToShowtimes: () => void;
  onOpenTrailer: () => void;
}

export function MovieDetailHero({
  movie,
  onScrollToShowtimes,
  onOpenTrailer,
}: MovieDetailHeroProps) {
  return (
    <div className="relative border-b border-[#1F2937] bg-[#0B0F19] py-8 sm:py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start lg:gap-12">
          {/* Poster */}
          <div className="relative aspect-2/3 w-full max-w-65 shrink-0 overflow-hidden rounded-xl border border-[#1F2937] shadow-2xl mx-auto md:mx-0">
            <Image
              src={movie.posterUrl}
              alt={movie.title}
              fill
              priority
              className="object-cover"
              sizes="260px"
            />
          </div>

          {/* Details */}
          <div className="flex-1 space-y-4 text-center md:text-left">
            <h1 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl lg:text-4xl">
              {movie.title}
            </h1>

            {/* Badges & Meta info */}
            <div className="flex flex-wrap items-center justify-center text-xs text-[#9CA3AF] md:justify-start">
              <span className="rounded bg-[#1F2937] px-2 py-0.5 font-bold text-white">
                {movie.format}
              </span>
            </div>
            {/* Director & Cast */}
            <div className="space-y-1.5 pt-2 text-sm">
              <p className="text-[#9CA3AF]">
                <strong className="text-white font-medium">Đạo diễn:</strong>{" "}
                {movie.director}
              </p>
              <p className="text-[#9CA3AF]">
                <strong className="text-white font-medium">Diễn viên:</strong>{" "}
                {movie.cast}
              </p>
              <p className="text-[#9CA3AF]">
                <strong className="text-white font-medium">Thể loại:</strong>{" "}
                {movie.genre}
              </p>
              <p className="text-[#9CA3AF]">
                <strong className="text-white font-medium">Khởi chiếu:</strong>{" "}
                {movie.releaseDate}
              </p>
              <p className="text-[#9CA3AF]">
                <strong className="text-white font-medium">Thời lượng:</strong>{" "}
                {movie.duration} phút
              </p>
              <p className="text-[#9CA3AF]">
                <strong className="text-white font-medium">Rated:</strong>{" "}
                {movie.ageRating}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4 md:justify-start">
              <button
                onClick={onOpenTrailer}
                className="flex h-11 items-center gap-2 rounded-lg border border-[#374151] px-6 text-sm font-semibold text-white transition hover:bg-[#1F2937]"
              >
                <Play size={16} fill="white" />
                XEM TRAILER
              </button>

              <button
                onClick={onScrollToShowtimes}
                className="flex h-11 items-center rounded-lg bg-[#EF4444] px-8 text-sm font-bold text-white transition hover:bg-[#F87171] active:scale-[0.98]"
              >
                ĐẶT VÉ NGAY
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
