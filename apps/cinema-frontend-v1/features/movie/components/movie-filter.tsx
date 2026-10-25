"use client";

import { Search, RotateCcw } from "lucide-react";
import type { MovieGenre } from "../types/movie.type";

interface MovieFilterProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedGenre: string;
  onGenreChange: (genre: string) => void;
  selectedAge: string;
  onAgeChange: (age: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  onReset: () => void;
  genreList?: MovieGenre[];
}

const DEFAULT_GENRES = [
  "Tất cả",
  "Hành Động",
  "Kinh Dị",
  "Hài Hước",
  "Tình Cảm",
  "Hoạt Hình",
  "Khoa Học Viễn Tưởng",
  "Tâm Lý",
];

const AGE_RATINGS = ["Tất cả", "P", "K", "T13", "T16", "T18"];

export function MovieFilter({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  selectedGenre,
  onGenreChange,
  selectedAge,
  onAgeChange,
  sortBy,
  onSortChange,
  onReset,
  genreList,
}: MovieFilterProps) {
  const genresToRender =
    genreList && genreList.length > 0
      ? genreList.map((g) => g.name)
      : DEFAULT_GENRES;

  return (
    <div className="space-y-6">
      {/* 1. Tab Trạng Thái Phim */}
      <div className="flex border-b border-[#1F2937] overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => onTabChange("SHOWING")}
          className={`shrink-0 border-b-2 px-6 py-3.5 text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${
            activeTab === "SHOWING"
              ? "border-[#EF4444] text-[#EF4444]"
              : "border-transparent text-[#9CA3AF] hover:text-white"
          }`}
        >
          Phim Đang Chiếu
        </button>
        <button
          type="button"
          onClick={() => onTabChange("UPCOMING")}
          className={`shrink-0 border-b-2 px-6 py-3.5 text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${
            activeTab === "UPCOMING"
              ? "border-[#EF4444] text-[#EF4444]"
              : "border-transparent text-[#9CA3AF] hover:text-white"
          }`}
        >
          Phim Sắp Chiếu
        </button>
        <button
          type="button"
          onClick={() => onTabChange("SPECIAL")}
          className={`shrink-0 border-b-2 px-6 py-3.5 text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${
            activeTab === "SPECICAL"
              ? "border-[#EF4444] text-[#EF4444]"
              : "border-transparent text-[#9CA3AF] hover:text-white"
          }`}
        >
          Suất Chiếu Đặc Biệt
        </button>
      </div>

      {/* 2. Thanh Tìm Kiếm & Các Dropdown Bộ Lọc */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#1F2937] bg-[#111827] p-4 sm:grid-cols-2 lg:grid-cols-12 lg:items-center">
        {/* Ô tìm kiếm tên phim */}
        <div className="relative lg:col-span-5 h-10">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm kiếm phim theo tên..."
            className="w-full h-full rounded-lg border border-[#1F2937] bg-[#0B0F19] pl-10 pr-3.5 text-xs text-white placeholder-[#6B7280] focus:border-[#EF4444] focus:outline-none"
          />
        </div>

        {/* Lọc theo Thể loại */}
        <div className="lg:col-span-2 h-10">
          <select
            value={selectedGenre}
            onChange={(e) => onGenreChange(e.target.value)}
            className="w-full h-full rounded-lg border border-[#1F2937] bg-[#0B0F19] px-3 text-xs text-white focus:border-[#EF4444] focus:outline-none cursor-pointer"
          >
            {genresToRender.map((g) => (
              <option key={g} value={g} className="bg-[#111827] text-white">
                {g === "Tất cả" ? "Thể loại: Tất cả" : g}
              </option>
            ))}
          </select>
        </div>

        {/* Lọc theo Độ tuổi */}
        <div className="lg:col-span-2 h-10">
          <select
            value={selectedAge}
            onChange={(e) => onAgeChange(e.target.value)}
            className="w-full h-full rounded-lg border border-[#1F2937] bg-[#0B0F19] px-3 text-xs text-white focus:border-[#EF4444] focus:outline-none cursor-pointer"
          >
            {AGE_RATINGS.map((a) => (
              <option key={a} value={a} className="bg-[#111827] text-white">
                {a === "Tất cả" ? "Độ tuổi: Tất cả" : `Nhãn ${a}`}
              </option>
            ))}
          </select>
        </div>

        {/* Sắp xếp */}
        <div className="lg:col-span-2 h-10">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="w-full h-full rounded-lg border border-[#1F2937] bg-[#0B0F19] px-3 text-xs text-white focus:border-[#EF4444] focus:outline-none cursor-pointer"
          >
            <option value="popular" className="bg-[#111827]">
              Sắp xếp: Phổ biến
            </option>
            <option value="rating" className="bg-[#111827]">
              Sắp xếp: Điểm đánh giá
            </option>
            <option value="latest" className="bg-[#111827]">
              Sắp xếp: Mới nhất
            </option>
          </select>
        </div>

        {/* Nút Reset */}
        <div className="lg:col-span-1 h-10">
          <button
            type="button"
            onClick={onReset}
            className="flex w-full h-full items-center justify-center gap-1.5 rounded-lg border border-[#374151] bg-transparent text-xs font-semibold text-[#9CA3AF] transition hover:border-[#EF4444] hover:text-white cursor-pointer"
            title="Đặt lại bộ lọc"
          >
            <RotateCcw size={14} />
            <span className="lg:hidden">Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
}
