import { Expose, Type, Transform } from 'class-transformer';

export class ShowtimeListMovieDto {
  @Transform(({ value }) => Number(value)) // Tự động convert BigInt/String sang Number
  @Expose()
  id: number;
  @Expose() title: string;
  @Expose() posterUrl: string;
  @Expose() ageRating: string;
}

export class ShowtimeListCineplexDto {
  @Transform(({ value }) => Number(value))
  @Expose()
  id: number;
  @Expose() name: string;
}

export class ShowtimeListAuditoriumDto {
  @Transform(({ value }) => Number(value))
  @Expose()
  id: number;
  @Expose() name: string;
}

export class ShowtimeListResponseDto {
  @Transform(({ value }) => Number(value))
  @Expose()
  id: number;

  @Expose()
  @Type(() => ShowtimeListMovieDto)
  movie: ShowtimeListMovieDto;

  // Lấy dữ liệu từ s.auditorium.cineplex map thẳng sang root cineplex của DTO
  @Expose()
  @Transform(({ obj }) => obj.auditorium?.cineplex ?? null)
  @Type(() => ShowtimeListCineplexDto)
  cineplex: ShowtimeListCineplexDto;

  @Expose()
  @Type(() => ShowtimeListAuditoriumDto)
  auditorium: ShowtimeListAuditoriumDto;

  @Expose() projectionType: string;
  @Expose() audioLanguage: string;
  @Expose() subtitleLanguage: string;
  @Expose() startTime: Date;
  @Expose() endTime: Date;
  @Expose() status: string;
}
