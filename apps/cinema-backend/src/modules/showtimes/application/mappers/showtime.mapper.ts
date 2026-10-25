import { Showtime } from '../../domain/entities/showtime.entity.js';
import { ShowtimeSeat } from '../../domain/entities/showtime-seat.entity.js';
import { ShowtimeSeatPrice } from '../../domain/entities/showtime-seat-price.entity.js';
import type { ShowtimeSummaryDto } from '../../public-api/dto/showtime-summary.dto.js';
import type { SeatPriceSummaryDto } from '../../public-api/dto/seat-price.dto.js';
import type { SeatHoldSummaryDto } from '../../public-api/dto/seat-hold.dto.js';

/** Map entity Showtime → ShowtimeSummaryDto (công khai ra ngoài module) */
export function toShowtimeSummary(showtime: Showtime): ShowtimeSummaryDto {
  return {
    id: Number(showtime.id),
    movieId: Number(showtime.movieId),
    auditoriumId: Number(showtime.auditoriumId),
    projectionType: showtime.projectionType,
    audioLanguage: showtime.audioLanguage,
    subtitleLanguage: showtime.subtitleLanguage,
    startTime: showtime.startTime,
    endTime: showtime.endTime,
    status: showtime.status,
  };
}

/** Map entity ShowtimeSeatPrice → SeatPriceSummaryDto (công khai ra ngoài module) */
export function toSeatPriceSummary(
  price: ShowtimeSeatPrice,
): SeatPriceSummaryDto {
  return {
    seatTypeId: Number(price.seatTypeId),
    seatTypeCode: price.seatType?.code ?? '',
    seatTypeName: price.seatType?.name ?? '',
    finalPrice: Number(price.finalPrice),
    isOverridden: price.isOverridden,
  };
}

export function toShowtimeListItem(showtime: Showtime) {
  return {
    id: showtime.id,
    movie: showtime.movie
      ? {
          id: showtime.movie.id,
          title: showtime.movie.title,
          posterUrl: showtime.movie.posterUrl,
          ageRating: showtime.movie.ageRating,
        }
      : null,
    cineplex: showtime.auditorium?.cineplex
      ? {
          id: showtime.auditorium.cineplex.id,
          name: showtime.auditorium.cineplex.name,
        }
      : null,
    auditorium: showtime.auditorium
      ? {
          id: showtime.auditorium.id,
          name: showtime.auditorium.name,
        }
      : null,
    projectionType: showtime.projectionType,
    audioLanguage: showtime.audioLanguage,
    subtitleLanguage: showtime.subtitleLanguage,
    startTime: showtime.startTime,
    endTime: showtime.endTime,
    status: showtime.status,
  };
}
/** GET /showtimes/:id, PUT /showtimes/:id, PATCH /showtimes/:id/status */
export function toShowtimeDetail(showtime: Showtime) {
  return {
    id: showtime.id,
    movieId: showtime.movieId,
    auditoriumId: showtime.auditoriumId,
    startTime: showtime.startTime,
    endTime: showtime.endTime,
    status: showtime.status,
    createdAt: showtime.createdAt,
    updatedAt: showtime.updatedAt,
  };
}

/** Map entity ShowtimeSeat → SeatHoldSummaryDto (công khai ra ngoài module) */
export function toSeatHoldSummary(seat: ShowtimeSeat): SeatHoldSummaryDto {
  return {
    showtimeId: seat.showtimeId,
    seatId: seat.seatId,
    userId: seat.userId,
    holdExpiresAt: seat.holdExpiresAt,
  };
}
