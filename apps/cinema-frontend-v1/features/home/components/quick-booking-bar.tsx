"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  AlertCircle,
  Sparkles,
  Bot,
  ArrowRight,
  Loader2,
} from "lucide-react";

import { useCineplexes } from "@/features/cineplex/hooks/use-cineplexes";
import { useCineplexShowtimes } from "@/features/cineplex/hooks/use-cineplex-showtimes";
import { useMovies } from "@/features/movie/hooks/use-movies";
import {
  buildDateOptions,
  formatShowtimeTime,
  getProjectionLabel,
} from "@/features/showtimes/utils/showtimes-adapter";

interface QuickBookingBarProps {
  onOpenAIModal?: (prompt?: string) => void;
}

/** Tham số cố định để query key của react-query không đổi mỗi lần render. */
const CINEPLEX_QUERY = { status: "ACTIVE", limit: 100 } as const;
const MOVIE_QUERY = { status: "SHOWING", limit: 50 } as const;

interface MovieOption {
  id: string;
  title: string;
}

interface ShowtimeOption {
  id: string;
  label: string;
}

export function QuickBookingBar({ onOpenAIModal }: QuickBookingBarProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"manual" | "ai">("manual");

  // State cho Đặt vé thủ công
  const [cinemaId, setCinemaId] = useState("");
  const [movieId, setMovieId] = useState("");
  const [date, setDate] = useState(() => buildDateOptions()[0].fullDate);
  const [showtimeId, setShowtimeId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // State cho Đặt vé AI
  const [aiPrompt, setAiPrompt] = useState("");

  /** Danh sách 7 ngày (hôm nay + 6 ngày sau) theo giờ Việt Nam. */
  const dateOptions = useMemo(() => buildDateOptions(), []);

  /* -----------------------------------------------------------------------
   * Dữ liệu thật từ backend
   * --------------------------------------------------------------------- */

  // 1. Danh sách cụm rạp đang hoạt động
  const {
    data: cineplexData,
    isLoading: isCineplexLoading,
    isError: isCineplexError,
  } = useCineplexes(CINEPLEX_QUERY);

  const cineplexes = useMemo(() => cineplexData?.items ?? [], [cineplexData]);

  // 2. Phim đang chiếu — dùng để dựng gợi ý/câu mẫu cho tab AI
  const { movies: showingMovies, isLoading: isMoviesLoading } =
    useMovies(MOVIE_QUERY);

  // 3. Lịch chiếu của rạp đã chọn trong ngày đã chọn — backend gom theo phim
  const parsedCinemaId = Number(cinemaId);
  const hasCinema = Number.isInteger(parsedCinemaId) && parsedCinemaId > 0;
  const showtimeParams = useMemo(() => ({ date }), [date]);
  const {
    data: showtimeGroups,
    isLoading: isShowtimeLoading,
    isError: isShowtimeError,
  } = useCineplexShowtimes(hasCinema ? parsedCinemaId : 0, showtimeParams);

  /** Phim đang có suất chiếu tại rạp/ngày đã chọn. */
  const scheduledMovies = useMemo<MovieOption[]>(
    () =>
      (showtimeGroups ?? []).map((group) => ({
        id: String(group.movieId),
        title: group.movieTitle,
      })),
    [showtimeGroups],
  );

  /**
   * Danh sách phim cho dropdown: chỉ lấy phim thực sự có suất chiếu tại rạp
   * trong ngày đã chọn. Dùng danh sách phim đang chiếu làm dự phòng sẽ tạo
   * ra lựa chọn "không có suất chiếu" (dead-end) nên không dùng ở đây.
   */
  const movieOptions = scheduledMovies;

  /**
   * Phim đang chọn chỉ hợp lệ khi vẫn còn trong danh sách hiện tại — dữ liệu
   * nền có thể đổi (đổi rạp, đổi ngày, tải lại) nên không giữ lựa chọn cũ.
   */
  const activeMovieId = movieOptions.some((movie) => movie.id === movieId)
    ? movieId
    : "";

  /** Các suất chiếu của phim đang chọn, sắp xếp theo giờ chiếu. */
  const showtimeOptions = useMemo<ShowtimeOption[]>(() => {
    if (!activeMovieId) return [];
    const group = (showtimeGroups ?? []).find(
      (item) => String(item.movieId) === activeMovieId,
    );
    if (!group) return [];

    return [...group.showtimes]
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      )
      .map((showtime) => {
        const parts = [
          formatShowtimeTime(showtime.startTime),
          getProjectionLabel(showtime.projectionType ?? ""),
        ];
        if (showtime.audioLanguage) parts.push(showtime.audioLanguage);
        return { id: String(showtime.showtimeId), label: parts.join(" - ") };
      });
  }, [activeMovieId, showtimeGroups]);

  /** Suất chiếu đang chọn chỉ hợp lệ khi vẫn tồn tại trong danh sách. */
  const activeShowtimeId = showtimeOptions.some(
    (showtime) => showtime.id === showtimeId,
  )
    ? showtimeId
    : "";

  /* -----------------------------------------------------------------------
   * Handlers
   * --------------------------------------------------------------------- */

  const selectedCinema = cineplexes.find(
    (cineplex) => String(cineplex.id) === cinemaId,
  );
  const selectedMovie = movieOptions.find(
    (movie) => movie.id === activeMovieId,
  );
  const selectedDate = dateOptions.find((option) => option.fullDate === date);
  const selectedShowtime = showtimeOptions.find(
    (showtime) => showtime.id === activeShowtimeId,
  );

  /** Sinh prompt mặc định từ lựa chọn hiện tại của form thủ công. */
  const buildDefaultPrompt = (): string => {
    const parts: string[] = [];
    if (selectedMovie) parts.push(`phim ${selectedMovie.title}`);
    if (selectedCinema) parts.push(`rạp ${selectedCinema.name}`);
    if (selectedDate) {
      parts.push(
        `${selectedDate.dayName.toLowerCase()} (${selectedDate.dayNumber})`,
      );
    }
    if (parts.length === 0) return "";
    return `Đặt vé ${parts.join(" tại ")}`;
  };

  const handleBooking = () => {
    if (!cinemaId || !activeMovieId || !date || !activeShowtimeId) {
      setErrorMessage("Vui lòng chọn đầy đủ rạp, phim, ngày và suất chiếu.");
      return;
    }
    setErrorMessage("");
    router.push(`/booking/seat-selection?showtimeId=${activeShowtimeId}`);
  };

  const handleAISubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (onOpenAIModal) {
      onOpenAIModal(
        aiPrompt || buildDefaultPrompt() || "Tìm suất chiếu phim hot tối nay",
      );
    }
  };

  const handleChipClick = (chipText: string) => {
    setAiPrompt(chipText);
    if (onOpenAIModal) {
      onOpenAIModal(chipText);
    }
  };

  /** Đưa lựa chọn hiện tại của form thủ công sang prompt AI. */
  const handleUseSelection = () => {
    const prompt = buildDefaultPrompt();
    if (!prompt) {
      setErrorMessage("Hãy chọn rạp và phim trước khi dùng trợ lý AI.");
      return;
    }
    setErrorMessage("");
    setMode("ai");
    setAiPrompt(prompt);
    if (onOpenAIModal) {
      onOpenAIModal(prompt);
    }
  };

  /* -----------------------------------------------------------------------
   * Nội dung gợi ý cho tab AI (dựng từ dữ liệu thật)
   * --------------------------------------------------------------------- */

  const aiChips = useMemo(() => {
    const chips: string[] = [];

    const firstScheduled = scheduledMovies[0];
    if (firstScheduled) {
      chips.push(`🎬 Suất chiếu ${firstScheduled.title} hôm nay`);
    }

    const firstCinema = cineplexes[0];
    if (firstCinema) {
      chips.push(`📍 Suất chiếu sau 19h tại ${firstCinema.name}`);
    }

    const firstShowing = showingMovies[0];
    if (firstShowing) {
      chips.push(`🔥 Gợi ý phim đang chiếu: ${firstShowing.title}`);
    }

    if (chips.length === 0) {
      chips.push("Tìm suất chiếu phim hot tối nay");
    }

    return chips;
  }, [scheduledMovies, cineplexes, showingMovies]);

  const aiPlaceholder = useMemo(() => {
    const firstScheduled = scheduledMovies[0];
    if (firstScheduled) {
      return `Nhập yêu cầu: 'Đặt 2 vé ${firstScheduled.title} tối nay'...`;
    }
    const firstShowing = showingMovies[0];
    if (firstShowing) {
      return `Nhập yêu cầu: 'Đặt 2 vé ${firstShowing.title} tối nay'...`;
    }
    return "Nhập yêu cầu: 'Đặt 2 vé phim hot tối nay rạp gần nhất'...";
  }, [scheduledMovies, showingMovies]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="relative -mt-10 z-20 overflow-hidden rounded-2xl border border-[#1F2937] bg-[#111827]/95 shadow-2xl backdrop-blur-md">
        {/* Tab Switcher: Manual vs AI */}
        <div className="flex border-b border-[#1F2937] bg-[#0B0F19]/80 px-4 pt-2">
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition ${
              mode === "manual"
                ? "border-[#EF4444] text-white"
                : "border-transparent text-[#9CA3AF] hover:text-white"
            }`}
          >
            <span>Đặt Vé Nhanh</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("ai")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition ${
              mode === "ai"
                ? "border-[#EF4444] bg-red-500/10 text-white"
                : "border-transparent text-[#9CA3AF] hover:text-white"
            }`}
          >
            <span className="bg-linear-to-r from-amber-400 to-red-400 bg-clip-text text-transparent font-black">
              Đặt Vé Với Trợ Lý AI
            </span>
            <span className="rounded-full bg-[#EF4444] px-1.5 py-0.5 text-[9px] font-black uppercase text-white">
              Mới
            </span>
          </button>
        </div>

        {/* Content Mode 1: Manual Dropdowns */}
        {mode === "manual" && (
          <div className="p-4 lg:p-6 space-y-3">
            <div className="flex flex-col items-center justify-between gap-4 lg:flex-row">
              {/* Dropdowns Container */}
              <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {/* 1. Chọn Rạp */}
                <div className="relative">
                  <select
                    value={cinemaId}
                    onChange={(e) => {
                      setCinemaId(e.target.value);
                      // Đổi rạp => lịch chiếu khác, bỏ chọn phim/suất cũ
                      setMovieId("");
                      setShowtimeId("");
                      setErrorMessage("");
                    }}
                    disabled={isCineplexLoading}
                    className="h-11 w-full appearance-none rounded-lg border border-[#1F2937] bg-[#0B0F19] px-3.5 pr-8 text-sm text-white outline-none transition hover:border-[#374151] focus:border-[#EF4444] disabled:opacity-50"
                  >
                    <option value="">
                      {isCineplexLoading
                        ? "Đang tải rạp..."
                        : isCineplexError
                          ? "Không tải được danh sách rạp"
                          : "1. Chọn Rạp"}
                    </option>
                    {cineplexes.map((cineplex) => (
                      <option key={cineplex.id} value={String(cineplex.id)}>
                        {cineplex.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-3.5 text-[#6B7280]"
                    size={16}
                  />
                </div>

                {/* 2. Chọn Phim */}
                <div className="relative">
                  <select
                    value={activeMovieId}
                    disabled={!cinemaId || isShowtimeLoading}
                    onChange={(e) => {
                      setMovieId(e.target.value);
                      setShowtimeId("");
                      setErrorMessage("");
                    }}
                    className="h-11 w-full appearance-none rounded-lg border border-[#1F2937] bg-[#0B0F19] px-3.5 pr-8 text-sm text-white outline-none transition hover:border-[#374151] focus:border-[#EF4444] disabled:opacity-50"
                  >
                    <option value="">
                      {isShowtimeLoading
                        ? "Đang tải phim..."
                        : !cinemaId
                          ? "2. Chọn Phim"
                          : movieOptions.length === 0
                            ? "Rạp chưa có lịch chiếu"
                            : "2. Chọn Phim"}
                    </option>
                    {movieOptions.map((movie) => (
                      <option key={movie.id} value={movie.id}>
                        {movie.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-3.5 text-[#6B7280]"
                    size={16}
                  />
                </div>

                {/* 3. Chọn Ngày */}
                <div className="relative">
                  <select
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setShowtimeId("");
                      setErrorMessage("");
                    }}
                    className="h-11 w-full appearance-none rounded-lg border border-[#1F2937] bg-[#0B0F19] px-3.5 pr-8 text-sm text-white outline-none transition hover:border-[#374151] focus:border-[#EF4444]"
                  >
                    {dateOptions.map((option, index) => (
                      <option key={option.fullDate} value={option.fullDate}>
                        {index + 1}. {option.dayName}, {option.dayNumber}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-3.5 text-[#6B7280]"
                    size={16}
                  />
                </div>

                {/* 4. Chọn Suất */}
                <div className="relative">
                  <select
                    value={activeShowtimeId}
                    disabled={!activeMovieId || isShowtimeLoading}
                    onChange={(e) => {
                      setShowtimeId(e.target.value);
                      setErrorMessage("");
                    }}
                    className="h-11 w-full appearance-none rounded-lg border border-[#1F2937] bg-[#0B0F19] px-3.5 pr-8 text-sm text-white outline-none transition hover:border-[#374151] focus:border-[#EF4444] disabled:opacity-50"
                  >
                    <option value="">
                      {isShowtimeLoading
                        ? "Đang tải suất..."
                        : !activeMovieId
                          ? "4. Chọn Suất"
                          : showtimeOptions.length === 0
                            ? "Không có suất chiếu"
                            : "4. Chọn Suất"}
                    </option>
                    {showtimeOptions.map((showtime) => (
                      <option key={showtime.id} value={showtime.id}>
                        {showtime.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-3.5 text-[#6B7280]"
                    size={16}
                  />
                </div>
              </div>

              {/* Action Button */}
              <div className="flex w-full flex-col gap-2 lg:w-auto lg:shrink-0">
                <button
                  type="button"
                  onClick={handleBooking}
                  disabled={!selectedShowtime}
                  className="h-11 w-full whitespace-nowrap rounded-lg bg-[#EF4444] px-7 text-sm font-bold text-white transition hover:bg-[#F87171] active:scale-[0.98] lg:w-auto shrink-0 shadow-lg shadow-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Đặt Ngay
                </button>
                <button
                  type="button"
                  onClick={handleUseSelection}
                  className="flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-[#1F2937] bg-[#0B0F19] px-4 text-xs font-semibold text-[#9CA3AF] transition hover:border-[#F59E0B] hover:text-white"
                >
                  <Sparkles size={13} className="text-[#F59E0B]" />
                  Dùng lựa chọn này với AI
                </button>
              </div>
            </div>

            {/* Tóm tắt lựa chọn hiện tại */}
            {(selectedCinema || selectedMovie || selectedShowtime) && (
              <p className="text-xs text-[#9CA3AF]">
                {[
                  selectedCinema?.name,
                  selectedMovie?.title,
                  selectedDate
                    ? `${selectedDate.dayName}, ${selectedDate.dayNumber}`
                    : null,
                  selectedShowtime?.label,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}

            {/* Trạng thái tải / lỗi của dữ liệu suất chiếu */}
            {(isShowtimeLoading || isShowtimeError || isMoviesLoading) && (
              <p className="flex items-center gap-1.5 text-xs text-[#9CA3AF]">
                {isShowtimeError ? (
                  <>
                    <AlertCircle size={14} className="text-red-400" />
                    <span className="text-red-400">
                      Không tải được lịch chiếu. Vui lòng thử lại.
                    </span>
                  </>
                ) : isShowtimeLoading || isMoviesLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Đang tải lịch chiếu...</span>
                  </>
                ) : null}
              </p>
            )}

            {/* Inline validation message */}
            {errorMessage && (
              <div className="flex items-center gap-1.5 text-xs text-red-400">
                <AlertCircle size={14} />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* Content Mode 2: AI Natural Language Booking */}
        {mode === "ai" && (
          <div className="p-4 lg:p-6 space-y-4">
            <form
              onSubmit={handleAISubmit}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={aiPlaceholder}
                  className="h-12 w-full rounded-xl border border-red-500/40 bg-[#080C15] pl-4 pr-10 text-sm text-white placeholder-[#6B7280] shadow-inner focus:border-[#EF4444] focus:outline-none focus:ring-1 focus:ring-[#EF4444]"
                />
                <Bot
                  size={18}
                  className="absolute right-3.5 top-3.5 text-[#F59E0B]"
                />
              </div>

              <button
                type="submit"
                className="flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-linear-to-r from-[#EF4444] to-[#DC2626] px-6 text-sm font-bold text-white shadow-lg shadow-red-500/25 transition hover:brightness-110 active:scale-[0.98]"
              >
                <Sparkles size={16} />
                <span>Trò Chuyện Với AI</span>
                <ArrowRight size={15} />
              </button>
            </form>

            {/* Prompt Chips — sinh từ dữ liệu rạp/phim thật */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[#9CA3AF] text-[11px] font-semibold">
                Gợi ý phổ biến:
              </span>
              {aiChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleChipClick(chip)}
                  className="rounded-lg border border-[#1F2937] bg-[#0B0F19] px-2.5 py-1 text-[11px] text-slate-300 hover:border-[#EF4444] hover:text-white transition"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
