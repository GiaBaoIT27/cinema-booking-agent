import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class UpdateMovieGenresDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  genreIds: string[];
}
