import type { Movie } from "../components/movie-card";
import type { MovieDetail, MovieListItem } from "../types/movie.type";

const DEFAULT_POSTER =
  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&q=80";

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "Sắp chiếu";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

function mapStatus(status?: string): "UPCOMING" | "SHOWING" | "SPECIAL" {
  if (status === "UPCOMING") return "UPCOMING";
  if (status === "SHOWING") return "SHOWING";
  return "SHOWING";
}

function mapAgeRating(age?: string): "P" | "K" | "T13" | "T16" | "T18" {
  if (age === "P" || age === "K" || age === "T13" || age === "T16" || age === "T18") {
    return age;
  }
  return "T13";
}

/**
 * Chuyển đổi dữ liệu MovieListItem từ Backend sang model Movie của UI MovieCard
 */
export function toUiMovie(item: MovieListItem): Movie {
  return {
    id: String(item.id),
    title: item.title,
    originalTitle: item.originalTitle ?? undefined,
    posterUrl: item.posterUrl || DEFAULT_POSTER,
    ageRating: mapAgeRating(item.ageRating),
    formats: item.formats && item.formats.length > 0 ? item.formats : ["2D", "LỒNG TIẾNG"],
    genres: item.genres && item.genres.length > 0 ? item.genres : ["Điện Ảnh"],
    durationMinutes: item.durationMinutes || 120,
    releaseDate: formatDate(item.releaseDate),
    rating: item.rating || 9.0,
    status: mapStatus(item.status),
    trailerUrl: item.trailerUrl ?? null,
  };
}

/**
 * Chuyển đổi dữ liệu MovieDetail từ Backend sang model hiển thị của MovieDetailHero
 */
export function toUiMovieDetail(detail: MovieDetail) {
  const genreList = (detail.genres ?? []).map((g) => g.name);
  return {
    id: String(detail.id),
    title: detail.title,
    originalTitle: detail.originalTitle ?? "",
    posterUrl: detail.posterUrl || DEFAULT_POSTER,
    bannerUrl: detail.bannerUrl || detail.posterUrl || DEFAULT_POSTER,
    format: "2D / Phụ Đề",
    genre: genreList.length > 0 ? genreList.join(", ") : "Hành Động, Tâm Lý",
    duration: detail.durationMinutes || 120,
    country: detail.country || "Việt Nam",
    releaseDate: formatDate(detail.releaseDate),
    director: detail.director || "Đang cập nhật",
    cast: detail.cast || "Đang cập nhật",
    synopsis: detail.description || "Nội dung phim đang được cập nhật...",
    trailerUrl: detail.trailerUrl,
    ageRating: mapAgeRating(detail.ageRating),
    status: detail.status,
  };
}

/**
 * Chuyển đổi đường dẫn trailer từ YouTube hoặc nguồn video sang URL nhúng iframe/video.
 * Trả về null nếu không có trailer thật, KHÔNG fallback sang video giả/mock.
 */
export function getTrailerEmbedUrl(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Trường hợp YouTube: watch?v=ID hoặc youtu.be/ID hoặc embed/ID
  const ytMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?.*?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
  }

  // Nếu là URL http/https hợp lệ khác
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return null;
}

