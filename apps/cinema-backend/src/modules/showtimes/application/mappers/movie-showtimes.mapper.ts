import type { Showtime } from '../../domain/entities/showtime.entity.js';

/** Dòng dữ liệu mức chi tiết của GET /movies/:id/showtimes (trước khi gom theo cụm rạp). */
export interface MovieShowtimeRow {
  showtimeId: string;
  projectionType: string;
  startTime: Date;
  endTime: Date;
  auditoriumName: string;
  cineplexId: string;
  cineplexName: string;
}

/** Showtime (đã join auditorium + cineplex) → row; bỏ qua suất thiếu venue. */
export function toMovieShowtimeRow(showtime: Showtime): MovieShowtimeRow | null {
  const auditorium = showtime.auditorium;
  const cineplex = auditorium?.cineplex;
  if (!auditorium || !cineplex) return null;

  return {
    showtimeId: showtime.id,
    projectionType: showtime.projectionType,
    startTime: showtime.startTime,
    endTime: showtime.endTime,
    auditoriumName: auditorium.name,
    cineplexId: cineplex.id,
    cineplexName: cineplex.name,
  };
}

/**
 * GET /movies/:id/showtimes — gom suất chiếu theo cụm rạp (giữ thứ tự dữ liệu đầu vào).
 * Contract response giữ nguyên 100% so với phiên bản cũ nằm trong module movies
 * (toMovieShowtimesResponse của movie.mapper.ts).
 */
export function toMovieShowtimesResponse(
  movie: { id: string | number; title: string },
  rows: MovieShowtimeRow[],
) {
  const groups = new Map<
    number,
    {
      cineplexId: number;
      cineplexName: string;
      showtimes: Array<{
        showtimeId: number;
        auditoriumName: string;
        projectionType: string;
        startTime: Date;
        endTime: Date;
      }>;
    }
  >();

  for (const row of rows) {
    const cineplexId = Number(row.cineplexId);

    let group = groups.get(cineplexId);
    if (!group) {
      group = { cineplexId, cineplexName: row.cineplexName, showtimes: [] };
      groups.set(cineplexId, group);
    }

    group.showtimes.push({
      showtimeId: Number(row.showtimeId),
      auditoriumName: row.auditoriumName,
      projectionType: row.projectionType,
      startTime: row.startTime,
      endTime: row.endTime,
    });
  }

  return {
    movieId: Number(movie.id),
    movieTitle: movie.title,
    showtimesByCinema: Array.from(groups.values()),
  };
}
