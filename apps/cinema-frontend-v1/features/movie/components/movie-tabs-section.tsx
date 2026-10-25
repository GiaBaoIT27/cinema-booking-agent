"use client";

import { useState } from "react";
import Link from "next/link";
import { X, Film } from "lucide-react";
import { MovieCard, type Movie } from "./movie-card";
import { useMovies } from "../hooks/use-movies";
import { getTrailerEmbedUrl } from "../utils/movie-adapter";

export function MovieTabsSection() {
  const [activeTab, setActiveTab] = useState<
    "SHOWING" | "UPCOMING" | "SPECIAL"
  >("SHOWING");
  const [trailerMovie, setTrailerMovie] = useState<Movie | null>(null);

  const status = activeTab === "SHOWING" ? "SHOWING" : "UPCOMING";
  const { movies, isLoading } = useMovies({
    status,
    limit: 8,
  });

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Tab Controls */}
      <div className="flex items-center justify-center gap-8 border-b border-[#1F2937]">
        <button
          type="button"
          onClick={() => setActiveTab("SHOWING")}
          className={`relative pb-4 text-base font-extrabold uppercase tracking-wider transition ${
            activeTab === "SHOWING"
              ? "text-white"
              : "text-[#6B7280] hover:text-white"
          }`}
        >
          Phim Đang Chiếu
          {activeTab === "SHOWING" && (
            <span className="absolute -bottom-px left-0 h-0.5 w-full bg-[#EF4444]" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("UPCOMING")}
          className={`relative pb-4 text-base font-bold uppercase tracking-wider transition ${
            activeTab === "UPCOMING"
              ? "text-white"
              : "text-[#6B7280] hover:text-white"
          }`}
        >
          Phim Sắp Chiếu
          {activeTab === "UPCOMING" && (
            <span className="absolute -bottom-px left-0 h-0.5 w-full bg-[#EF4444]" />
          )}
        </button>
      </div>

      {/* Grid Danh Sách Phim */}
      {isLoading ? (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="flex flex-col overflow-hidden rounded-xl border border-[#1F2937] bg-[#111827] animate-pulse"
            >
              <div className="aspect-2/3 w-full bg-[#1F2937]" />
              <div className="p-4 space-y-3">
                <div className="h-4 w-3/4 rounded bg-[#1F2937]" />
                <div className="h-3 w-1/2 rounded bg-[#1F2937]" />
                <div className="h-9 w-full rounded bg-[#1F2937]" />
              </div>
            </div>
          ))}
        </div>
      ) : movies.length > 0 ? (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {movies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onOpenTrailer={setTrailerMovie}
            />
          ))}
        </div>
      ) : (
        <div className="mt-12 text-center py-12 border border-dashed border-[#1F2937] rounded-xl text-[#9CA3AF]">
          <p className="text-sm">Hiện chưa có phim nào trong danh mục này.</p>
        </div>
      )}

      {/* Nút Xem Thêm */}
      <div className="mt-10 text-center">
        <Link
          href={`/movies?tab=${activeTab === "SHOWING" ? "SHOWING" : "UPCOMING"}`}
          className="inline-flex h-11 items-center justify-center rounded-lg border border-[#374151] px-8 text-sm font-semibold text-white transition hover:border-white hover:bg-white/5"
        >
          XEM THÊM
        </Link>
      </div>

      {/* Modal Trailer */}
      {trailerMovie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-[#1F2937] bg-[#111827] p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2937]">
              <h3 className="text-sm font-bold uppercase text-white truncate max-w-[80%]">
                Trailer: {trailerMovie.title}
              </h3>
              <button
                type="button"
                onClick={() => setTrailerMovie(null)}
                className="rounded-lg p-1.5 text-[#9CA3AF] hover:bg-[#1F2937] hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>
            <div className="relative aspect-video w-full mt-3 overflow-hidden rounded-lg bg-black flex items-center justify-center">
              {(() => {
                const embedUrl = getTrailerEmbedUrl(trailerMovie.trailerUrl);
                return embedUrl ? (
                  <iframe
                    className="h-full w-full"
                    src={embedUrl}
                    title={`Trailer: ${trailerMovie.title}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="text-center p-6 space-y-2 text-[#9CA3AF]">
                    <Film size={36} className="mx-auto text-[#4B5563]" />
                    <p className="text-sm font-semibold text-white">
                      Chưa có video trailer cho bộ phim này
                    </p>
                    <p className="text-xs">
                      Thông tin trailer sẽ được cập nhật sớm nhất từ ban quản
                      trị rạp.
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
