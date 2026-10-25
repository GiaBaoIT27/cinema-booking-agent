import { Seat } from '../domain/entities/seat.entity.js';
import { Auditorium } from '../domain/entities/auditorium.entity.js';
import { Cineplex } from '../domain/entities/cineplex.entity.js';
import type { SeatSummaryDto } from './dto/seat-summary.dto.js';
import type { AuditoriumSummaryDto } from './dto/auditorium-summary.dto.js';
import type { CineplexSummaryDto } from './dto/cineplex-summary.dto.js';

export function toSeatSummary(seat: Seat): SeatSummaryDto {
  return {
    id: Number(seat.id),
    auditoriumId: Number(seat.auditoriumId),
    seatTypeId: Number(seat.seatTypeId),
    rowLabel: seat.rowLabel,
    columnNumber: seat.columnNumber,
    seatNumber: seat.seatNumber,
    coordX: seat.coordX,
    coordY: seat.coordY,
    gridSpan: seat.gridSpan,
    status: seat.status,
  };
}

export function toAuditoriumSummary(
  auditorium: Auditorium,
): AuditoriumSummaryDto {
  return {
    id: Number(auditorium.id),
    cineplexId: Number(auditorium.cineplexId),
    code: auditorium.code,
    name: auditorium.name,
    screenType: auditorium.screenType,
    totalSeats: auditorium.totalSeats,
    status: auditorium.status,
  };
}

export function toCineplexSummary(cineplex: Cineplex): CineplexSummaryDto {
  return {
    id: Number(cineplex.id),
    code: cineplex.code,
    name: cineplex.name,
    address: cineplex.address,
    status: cineplex.status,
    provinceId: Number(cineplex.provinceId),
    wardId: Number(cineplex.wardId),
  };
}
