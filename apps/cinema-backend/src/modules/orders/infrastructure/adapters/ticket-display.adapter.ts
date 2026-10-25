import { Injectable } from '@nestjs/common';

import { ShowtimesFacade } from '#modules/showtimes/public-api/index.js';
import { MoviesFacade } from '#modules/movies/public-api/index.js';
import { CinemasFacade } from '#modules/cinemas/public-api/index.js';
import type {
  ITicketDisplayLookup,
  SeatLabelRef,
  ShowtimeDisplayRef,
} from '../../application/ports/ticket-display-lookup.port.js';

/**
 * Adapter ghép thông tin hiển thị vé từ public API của showtimes, movies, cinemas
 * (thay cho các phép JOIN trực tiếp vào bảng của module khác).
 */
@Injectable()
export class TicketDisplayAdapter implements ITicketDisplayLookup {
  constructor(
    private readonly showtimesFacade: ShowtimesFacade,
    private readonly moviesFacade: MoviesFacade,
    private readonly cinemasFacade: CinemasFacade,
  ) {}

  async getShowtimeDisplayInfo(
    showtimeIds: string[],
  ): Promise<ShowtimeDisplayRef[]> {
    if (showtimeIds.length === 0) return [];

    const showtimes = await this.showtimesFacade.getShowtimesByIds(showtimeIds);
    const movieIds = [...new Set(showtimes.map((s) => s.movieId))];
    const auditoriumIds = [...new Set(showtimes.map((s) => s.auditoriumId))];

    const [movies, auditoriums] = await Promise.all([
      Promise.all(movieIds.map((id) => this.moviesFacade.getMovieById(id))),
      Promise.all(
        auditoriumIds.map((id) => this.cinemasFacade.getAuditoriumInfo(id)),
      ),
    ]);

    const titleByMovieId = new Map<number, string | null>();
    movieIds.forEach((id, index) =>
      titleByMovieId.set(id, movies[index]?.title ?? null),
    );
    const nameByAuditoriumId = new Map<number, string | null>();
    auditoriumIds.forEach((id, index) =>
      nameByAuditoriumId.set(id, auditoriums[index]?.name ?? null),
    );

    return showtimes.map((showtime) => ({
      showtimeId: String(showtime.id),
      movieTitle: titleByMovieId.get(showtime.movieId) ?? null,
      auditoriumName: nameByAuditoriumId.get(showtime.auditoriumId) ?? null,
      startTime: showtime.startTime,
    }));
  }

  async getSeatLabels(seatIds: string[]): Promise<SeatLabelRef[]> {
    if (seatIds.length === 0) return [];

    const seats = await this.cinemasFacade.getSeatsByIds(seatIds);
    return seats.map((seat) => ({
      seatId: String(seat.id),
      seatNumber: seat.seatNumber,
    }));
  }
}
