/**
 * Chuyển dữ liệu phim từ API sang dạng HeroBanner cần.
 */
export interface HeroMovie {
  id: string | number;
  title: string;
  imageUrl: string | null;
  genres: string[];
  durationMinutes: number | null;
  ageRating: string | null;
  trailerUrl: string | null;
}

type Raw = Record<string, unknown>;

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v : null;
const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

export function toHeroMovie(raw: Raw): HeroMovie {
  const genres = Array.isArray(raw.genres)
    ? (raw.genres as Raw[])
        .map((g) => (typeof g === "string" ? g : str(g?.name)))
        .filter((g): g is string => Boolean(g))
    : [];

  return {
    id: (raw.id as string | number) ?? "",
    title: str(raw.title) ?? str(raw.name) ?? "",
    // Ưu tiên ảnh ngang (backdrop/banner) cho hero, rơi về poster.
    imageUrl:
      str(raw.backdropUrl) ??
      str(raw.bannerUrl) ??
      str(raw.posterUrl) ??
      str(raw.poster),
    genres,
    durationMinutes: num(raw.durationMinutes) ?? num(raw.duration),
    ageRating: str(raw.ageRating) ?? str(raw.rating),
    trailerUrl: str(raw.trailerUrl) ?? str(raw.trailer),
  };
}
