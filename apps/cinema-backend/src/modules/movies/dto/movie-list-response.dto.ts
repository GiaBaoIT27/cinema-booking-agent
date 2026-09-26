import { Expose } from 'class-transformer';

export class MovieListResponseDto {
  @Expose() id: number;
  @Expose() title: string;
  @Expose() originalTitle: string;
  @Expose() durationMinutes: number;
  @Expose() ageRating: string;
  @Expose() posterUrl: string;
  @Expose() releaseDate: string;
  @Expose() endDate: string;
  @Expose() status: string;
  @Expose() createdAt: Date;
}
