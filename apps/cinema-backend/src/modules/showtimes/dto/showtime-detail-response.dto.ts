import { Expose, Type, Transform } from 'class-transformer';

export class ShowtimeDetailMovieDto {
  @Expose()
  @Transform(({ value }) => Number(value))
  id: number;

  @Expose()
  title: string;

  @Expose()
  originalTitle: string;

  @Expose()
  posterUrl: string;

  @Expose()
  bannerUrl: string;

  @Expose()
  durationMinutes: number;

  @Expose()
  ageRating: string;

  @Expose()
  trailerUrl: string;
}

export class ShowtimeDetailCineplexDto {
  @Expose()
  @Transform(({ value }) => Number(value))
  id: number;

  @Expose()
  name: string;

  @Expose()
  address: string;
}

export class ShowtimeDetailAuditoriumDto {
  @Expose()
  @Transform(({ value }) => Number(value))
  id: number;

  @Expose()
  name: string;
}

export class ShowtimeDetailResponseDto {
  @Expose()
  @Transform(({ value }) => Number(value))
  id: number;

  @Expose()
  @Type(() => ShowtimeDetailMovieDto)
  movie: ShowtimeDetailMovieDto;

  @Expose()
  @Type(() => ShowtimeDetailCineplexDto)
  cineplex: ShowtimeDetailCineplexDto;

  @Expose()
  @Type(() => ShowtimeDetailAuditoriumDto)
  auditorium: ShowtimeDetailAuditoriumDto;

  @Expose()
  projectionType: string;

  @Expose()
  audioLanguage: string;

  @Expose()
  subtitleLanguage: string;

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

  @Expose()
  updatedAt: Date;
}
