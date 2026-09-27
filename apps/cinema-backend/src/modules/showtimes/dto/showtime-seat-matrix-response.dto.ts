import { Expose, Type, Transform } from 'class-transformer';
import { ShowtimeSeatStatus } from '../enums/showtime-seat-status.js';

export class SeatStatusDto {
  @Expose()
  @Transform(({ value }) => Number(value))
  seatId: number;

  @Expose()
  rowLabel: string;

  @Expose()
  columnNumber: number;

  @Expose()
  seatNumber: string;

  @Expose()
  seatType: string;

  @Expose()
  status: ShowtimeSeatStatus | 'BLOCKED';

  @Expose()
  @Transform(({ value }) => Number(value))
  price: number;
}

export class ShowtimeSeatMatrixResponseDto {
  @Expose()
  @Transform(({ value }) => Number(value))
  showtimeId: number;

  @Expose()
  auditoriumName: string;

  @Expose()
  totalSeats: number;

  @Expose()
  availableSeats: number;

  @Expose()
  @Type(() => SeatStatusDto)
  seatMatrix: SeatStatusDto[];
}
