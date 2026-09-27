import { Expose, Type, Transform } from 'class-transformer';

export class ShowtimeItemDto {
  @Expose()
  @Transform(({ value }) => Number(value))
  showtimeId: number;

  @Expose()
  auditoriumName: string;

  @Expose()
  projectionType: string;

  @Expose()
  startTime: Date;

  @Expose()
  endTime: Date;
}

export class CinemaShowtimeGroupDto {
  @Expose()
  @Transform(({ value }) => Number(value))
  cineplexId: number;

  @Expose()
  cineplexName: string;

  @Expose()
  @Type(() => ShowtimeItemDto)
  showtimes: ShowtimeItemDto[];
}

export class MovieShowtimesResponseDto {
  @Expose()
  @Transform(({ value }) => Number(value))
  movieId: number;

  @Expose()
  movieTitle: string;

  @Expose()
  @Type(() => CinemaShowtimeGroupDto)
  showtimesByCinema: CinemaShowtimeGroupDto[];
}
