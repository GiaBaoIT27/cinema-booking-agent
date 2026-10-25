"use client";

import { useState, use } from "react";
import Link from "next/link";
import { X, ArrowLeft, LoaderCircle, Film } from "lucide-react";
import { MovieDetailHero } from "@/features/movie/components/movie-detail-hero";
import { MovieShowtimes } from "@/features/showtimes/components/movie-showtimes";
import { useMovieDetail } from "@/features/movie/hooks/use-movie-detail";
import { getTrailerEmbedUrl } from "@/features/movie/utils/movie-adapter";

interface MovieDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default function MovieDetailPage({ params }: MovieDetailPageProps) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const { movie, isLoading, error } = useMovieDetail(slug);
  const [showTrailer, setShowTrailer] = useState(false);

  const handleScrollToShowtimes = () => {
    const section = document.getElementById("showtimes-section");
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleOpenTrailer = () => {
    setShowTrailer(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080C15] flex flex-col items-center justify-center text-white">
        <LoaderCircle size={36} className="animate-spin text-[#EF4444] mb-3" />
        <p className="text-sm text-[#9CA3AF]">Đang tải thông tin bộ phim...</p>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-[#080C15] flex flex-col items-center justify-center text-white px-4">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-2xl font-bold text-white">
            Không tìm thấy thông tin phim
          </h2>
          <p className="text-sm text-[#9CA3AF]">
            {error ||
              "Bộ phim bạn đang tìm kiếm không tồn tại hoặc đã ngừng chiếu."}
          </p>
          <Link
            href="/movies"
            className="inline-flex items-center gap-2 rounded-lg bg-[#EF4444] px-6 py-2.5 text-xs font-bold uppercase text-white hover:bg-[#F87171] transition"
          >
            <ArrowLeft size={16} />
            Quay lại danh sách phim
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080C15] pb-16">
      {/* 1. Hero Thông tin phim */}
      <MovieDetailHero
        movie={movie}
        onScrollToShowtimes={handleScrollToShowtimes}
        onOpenTrailer={handleOpenTrailer}
      />

      <div className="mx-auto max-w-4xl px-4 pt-10 sm:px-6 lg:px-8 space-y-12">
        {/* 2. NỘI DUNG PHIM */}
        <section className="space-y-3 text-center border border-[#1F2937] bg-[#111827] p-5 rounded-xl">
          <h2 className="text-lg font-bold uppercase tracking-wider text-white">
            Nội Dung Phim
          </h2>
          <p className="text-xs sm:text-sm leading-relaxed text-[#9CA3AF]">
            {movie.synopsis}
          </p>
        </section>

        {/* 3. LỊCH CHIẾU & DANH SÁCH RẠP */}
        <MovieShowtimes movieId={movie.id} />
      </div>

      {/* Trailer Modal */}
      {showTrailer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-[#1F2937] bg-[#111827] p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2937]">
              <h3 className="text-sm font-bold uppercase text-white truncate max-w-[85%]">
                Trailer: {movie.title}
              </h3>
              <button
                type="button"
                onClick={() => setShowTrailer(false)}
                className="rounded-lg p-1.5 text-[#9CA3AF] hover:bg-[#1F2937] hover:text-white transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="relative aspect-video w-full mt-3 overflow-hidden rounded-lg bg-black flex items-center justify-center">
              {(() => {
                const embedUrl = getTrailerEmbedUrl(movie.trailerUrl);
                return embedUrl ? (
                  <iframe
                    className="h-full w-full"
                    src={embedUrl}
                    title={`Trailer: ${movie.title}`}
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
    </div>
  );
}
