import { Expose, Type } from 'class-transformer';

// Định nghĩa các object con trước
class DistributorDto {
  @Expose() id: number;
  @Expose() name: string;
}

class GenreDto {
  @Expose() id: number;
  @Expose() code: string;
  @Expose() name: string;
}

// Định nghĩa DTO chính
export class MovieDetailResponseDto {
  @Expose() id: number;
  @Expose() title: string;
  @Expose() originalTitle: string;
  @Expose() description: string;
  @Expose() director: string;
  @Expose() cast: string;
  @Expose() durationMinutes: number;
  @Expose() ageRating: string;
  @Expose() country: string;
  @Expose() originalLanguage: string;
  @Expose() revenueShareRatio: number;
  @Expose() trailerUrl: string;
  @Expose() posterUrl: string;
  @Expose() bannerUrl: string;
  @Expose() releaseDate: string;
  @Expose() endDate: string;
  @Expose() status: string;

  @Expose()
  @Type(() => DistributorDto)
  distributor: DistributorDto;

  @Expose()
  @Type(() => GenreDto)
  genres: GenreDto[];

  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}
