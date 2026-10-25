import { Seat } from '../../domain/entities/seat.entity.js';
import type { SeatTypeRef } from '../ports/seat-type-lookup.port.js';
import { computeGridDimensions } from '../../domain/services/seat-layout.rules.js';

/** GET / PUT /seats/:id — id trả về dạng string (giữ nguyên contract cũ). */
export function toSeatResponse(seat: Seat) {
  return {
    id: seat.id,
    auditoriumId: seat.auditoriumId,
    seatTypeId: seat.seatTypeId,
    rowLabel: seat.rowLabel,
    columnNumber: seat.columnNumber,
    seatNumber: seat.seatNumber,
    coordX: seat.coordX,
    coordY: seat.coordY,
    gridSpan: seat.gridSpan,
    status: seat.status,
    createdAt: seat.createdAt,
    updatedAt: seat.updatedAt,
  };
}

/** GET /auditoriums/:id/seats */
export function toSeatLayoutResponse(
  auditoriumId: number,
  seats: Seat[],
  seatTypes: SeatTypeRef[],
) {
  const seatTypeById = new Map(seatTypes.map((type) => [String(type.id), type]));

  const items = seats.map((seat) => {
    const seatType = seatTypeById.get(String(seat.seatTypeId));
    return {
      id: Number(seat.id),
      rowLabel: seat.rowLabel,
      columnNumber: seat.columnNumber,
      seatNumber: seat.seatNumber,
      coordinates: {
        x: seat.coordX,
        y: seat.coordY,
        gridSpan: seat.gridSpan,
      },
      seatType: seatType
        ? {
            id: Number(seatType.id),
            code: seatType.code,
            name: seatType.name,
            colorCode: seatType.colorCode,
          }
        : null,
      status: seat.status,
      createdAt: seat.createdAt,
      updatedAt: seat.updatedAt,
    };
  });

  return {
    auditoriumId: Number(auditoriumId),
    gridDimensions: computeGridDimensions(seats),
    totalSeats: items.length,
    seats: items,
  };
}

/** POST /auditoriums/:id/seats/batch */
export function toSeatLayoutConfiguredResponse(
  auditoriumId: number,
  totalSeatsConfigured: number,
  gridBounds: { maxX: number; maxY: number },
) {
  return {
    auditoriumId,
    totalSeatsConfigured,
    gridBounds,
    status: 'SUCCESS',
    configuredAt: new Date(),
  };
}
