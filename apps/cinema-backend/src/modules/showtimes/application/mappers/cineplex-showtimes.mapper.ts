import type { Showtime } from '../../domain/entities/showtime.entity.js';

/**
 * GET /cineplexes/:id/showtimes — gom suất chiếu theo phim.
 * Contract response giữ nguyên 100% so với phiên bản cũ nằm trong module cinemas
 * (mapper groupShowtimesByMovie của cineplex.mapper.ts).
 */
export function groupCineplexShowtimesByMovie(showtimes: Showtime[]) {
  const groups = new Map<
    number,
    {
      movieId: number;
      movieTitle: string;
      posterUrl: string | null;
      durationMinutes: number;
      ageRating: string | null;
      showtimes: Record<string, unknown>[];
    }
  >();

  for (const showtime of showtimes) {
    const movie = showtime.movie;
    const auditorium = showtime.auditorium;
    if (!movie || !auditorium) continue;

    const movieId = Number(movie.id);

    let group = groups.get(movieId);
    if (!group) {
      group = {
        movieId,
        movieTitle: movie.title,
        posterUrl: movie.posterUrl ?? null,
        durationMinutes: movie.durationMinutes,
        ageRating: movie.ageRating ?? null,
        showtimes: [],
      };
      groups.set(movieId, group);
    }

    group.showtimes.push({
      showtimeId: Number(showtime.id),
      auditoriumId: Number(auditorium.id),
      auditoriumName: auditorium.name,
      projectionType: showtime.projectionType,
      audioLanguage: showtime.audioLanguage ?? null,
      subtitleLanguage: showtime.subtitleLanguage ?? null,
      startTime: showtime.startTime,
      endTime: showtime.endTime,
      status: showtime.status,
    });
  }

  return Array.from(groups.values());
}
