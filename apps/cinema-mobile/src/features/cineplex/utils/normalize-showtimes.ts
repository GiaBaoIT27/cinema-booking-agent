import type {
  CineplexMovieShowtimeGroup,
  CineplexShowtimeItem,
} from "../types/cineplex.types";

type Rec = Record<string, unknown>;

const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null;
const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const num = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

function toItem(r: Rec): CineplexShowtimeItem {
  return {
    showtimeId: num(r.showtimeId ?? r.id),
    auditoriumId: num(r.auditoriumId),
    auditoriumName: str(r.auditoriumName ?? r.roomName),
    projectionType: typeof r.projectionType === "string" ? r.projectionType : null,
    startTime: str(r.startTime),
    endTime: str(r.endTime ?? r.startTime),
    status: typeof r.status === "string" ? r.status : null,
  };
}

const byStart = (a: CineplexShowtimeItem, b: CineplexShowtimeItem) =>
  a.startTime.localeCompare(b.startTime);

/**
 * Backend có thể trả nhóm sẵn theo phim { movieId, movieTitle, showtimes: [...] }
 * hoặc danh sách suất phẳng { id, startTime, movie: { id, title } }:
 * chuẩn hóa cả hai về nhóm theo phim.
 */
export function normalizeShowtimeGroups(raw: unknown): CineplexMovieShowtimeGroup[] {
  if (!Array.isArray(raw)) return [];
  const groups: CineplexMovieShowtimeGroup[] = [];

  for (const entry of raw) {
    if (!isRec(entry)) continue;

    if ("movieId" in entry && Array.isArray(entry.showtimes)) {
      groups.push({
        movieId: num(entry.movieId),
        movieTitle: str(entry.movieTitle, "Phim chưa đặt tên"),
        posterUrl: typeof entry.posterUrl === "string" ? entry.posterUrl : null,
        durationMinutes: num(entry.durationMinutes),
        ageRating: typeof entry.ageRating === "string" ? entry.ageRating : null,
        showtimes: entry.showtimes.filter(isRec).map(toItem).sort(byStart),
      });
      continue;
    }

    if (isRec(entry.movie)) {
      const movieId = num(entry.movie.id);
      const item = toItem(entry);
      const existing = groups.find((g) => g.movieId === movieId);
      if (existing) {
        existing.showtimes.push(item);
        existing.showtimes.sort(byStart);
      } else {
        groups.push({
          movieId,
          movieTitle: str(entry.movie.title),
          posterUrl:
            typeof entry.movie.posterUrl === "string" ? entry.movie.posterUrl : null,
          durationMinutes: 0,
          ageRating: null,
          showtimes: [item],
        });
      }
    }
  }
  return groups;
}
