"use client";

import { useState, useMemo } from "react";
import { MovieCard, type Movie } from "@/features/movie/components/movie-card";
import { MovieFilter } from "@/features/movie/components/movie-filter";
import { Film, X, RotateCcw } from "lucide-react";
import { useMovies } from "@/features/movie/hooks/use-movies";
import { useGenres } from "@/features/movie/hooks/use-genres";
import { getTrailerEmbedUrl } from "@/features/movie/utils/movie-adapter";
import type { MovieStatusType } from "@/features/movie/types/movie.type";

export default function MoviesPage() {
  const [activeTab, setActiveTab] = useState<string>("SHOWING");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedGenre, setSelectedGenre] = useState<string>("Tất cả");
  const [selectedAge, setSelectedAge] = useState<string>("Tất cả");
  const [sortBy, setSortBy] = useState<string>("popular");
  const [showTrailer, setShowTrailer] = useState<Movie | null>(null);

  const { genres } = useGenres();

  // Map activeTab sang backend status
  const backendStatus: MovieStatusType | undefined = useMemo(() => {
    if (activeTab === "SHOWING") return "SHOWING";
    if (activeTab === "UPCOMING") return "UPCOMING";
    return undefined;
  }, [activeTab]);

  // Map selectedGenre sang genre_id nếu có
  const genreIdParam: number | undefined = useMemo(() => {
    if (!selectedGenre || selectedGenre === "Tất cả") return undefined;
    const matched = genres.find((g) => g.name === selectedGenre);
    const numId = Number(matched?.id);
    return isNaN(numId) ? undefined : numId;
  }, [selectedGenre, genres]);

  // Map sortBy sang format của backend 'field:direction'
  const backendSort = useMemo(() => {
    if (sortBy === "rating") return "release_date:desc";
    if (sortBy === "latest") return "release_date:desc";
    return "release_date:desc";
  }, [sortBy]);

  const { movies, isLoading } = useMovies({
    status: backendStatus,
    search: searchQuery ? searchQuery.trim() : undefined,
    genre_id: genreIdParam,
    sort: backendSort,
    limit: 50,
  });

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedGenre("Tất cả");
    setSelectedAge("Tất cả");
    setSortBy("popular");
  };

  // Lọc bổ sung phía client nếu cần (như Age rating)
  const filteredMovies = useMemo(() => {
    return movies.filter((movie) => {
      // Lọc theo Độ tuổi nếu có chọn
      if (selectedAge !== "Tất cả" && movie.ageRating !== selectedAge) {
        return false;
      }
      return true;
    });
  }, [movies, selectedAge]);

  return (
    <div className="min-h-screen bg-[#080C15] pb-20 text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Banner Tiêu Đề */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#1F2937] pb-6">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
              LỊCH CHIẾU PHIM
            </h1>
            <p className="text-xs text-[#9CA3AF] sm:text-sm">
              Khám phá các tác phẩm điện ảnh đỉnh cao đang và sắp chiếu tại rạp.
            </p>
          </div>
        </div>

        {/* Bộ Lọc & Tab */}
        <MovieFilter
          activeTab={activeTab}
          onTabChange={setActiveTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedGenre={selectedGenre}
          onGenreChange={setSelectedGenre}
          selectedAge={selectedAge}
          onAgeChange={setSelectedAge}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onReset={handleResetFilters}
          genreList={genres}
        />

        {/* Trạng thái tải dữ liệu */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, idx) => (
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
        ) : filteredMovies.length > 0 ? (
          /* Lưới Phim */
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredMovies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onOpenTrailer={setShowTrailer}
              />
            ))}
          </div>
        ) : (
          /* Không tìm thấy phim */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#1F2937] bg-[#111827]/40 py-20 text-center">
            <Film size={48} className="text-[#4B5563] mb-4 stroke-1" />
            <h3 className="text-lg font-bold text-white">
              Không tìm thấy bộ phim phù hợp
            </h3>
            <p className="mt-1 text-xs text-[#9CA3AF] max-w-sm">
              Rất tiếc, chúng tôi không tìm thấy bộ phim nào phù hợp với các
              tiêu chí tìm kiếm của bạn.
            </p>
            <button
              onClick={handleResetFilters}
              className="mt-6 flex items-center gap-2 rounded-lg bg-[#EF4444] px-5 py-2.5 text-s font-bold text-white transition hover:bg-[#F87171] cursor-pointer"
            >
              <RotateCcw size={14} />
              Xóa Tất Cả Bộ Lọc
            </button>
          </div>
        )}
      </div>

      {/* Trailer Modal */}
      {showTrailer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-[#1F2937] bg-[#111827] p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2937]">
              <h3 className="text-sm font-bold uppercase text-white truncate max-w-[85%]">
                Trailer: {showTrailer.title}
              </h3>
              <button
                type="button"
                onClick={() => setShowTrailer(null)}
                className="rounded-lg p-1.5 text-[#9CA3AF] hover:bg-[#1F2937] hover:text-white transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="relative aspect-video w-full mt-3 overflow-hidden rounded-lg bg-black flex items-center justify-center">
              {(() => {
                const embedUrl = getTrailerEmbedUrl(showTrailer.trailerUrl);
                return embedUrl ? (
                  <iframe
                    className="h-full w-full"
                    src={embedUrl}
                    title={`Trailer: ${showTrailer.title}`}
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
