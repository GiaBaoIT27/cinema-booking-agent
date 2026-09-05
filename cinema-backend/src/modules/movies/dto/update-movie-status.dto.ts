import { IsEnum, IsNotEmpty } from 'class-validator';
import { MovieStatus } from '../enums/movie-status.enum.js';

export class UpdateMovieStatusDto {
  @IsEnum(MovieStatus)
  @IsNotEmpty()
  status: MovieStatus;
}
