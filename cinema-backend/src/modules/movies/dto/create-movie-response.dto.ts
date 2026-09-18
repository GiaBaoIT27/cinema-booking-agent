import { Expose } from 'class-transformer';
import { MovieStatus } from '../enums/movie-status.enum.js';

export class CreateMovieResponseDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  status: MovieStatus;

  @Expose()
  createdAt: Date;
}
