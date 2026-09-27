import { Expose, Transform } from 'class-transformer';

export class CreateShowtimeResponseDto {
  @Expose()
  @Transform(({ value }) => Number(value))
  id: number;

  @Expose()
  @Transform(({ value }) => Number(value))
  auditoriumId: number;

  @Expose()
  @Transform(({ value }) => Number(value))
  movieId: number;

  @Expose()
  projectionType: string;

  @Expose()
  startTime: Date;

  @Expose()
  endTime: Date;

  @Expose()
  cleaningMinutes: number;

  @Expose()
  status: string;

  @Expose()
  createdAt: Date;
}
