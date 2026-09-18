import { OmitType } from '@nestjs/mapped-types';
import { CreateMovieDto } from './create-movie.dto.js';

export class UpdateMovieDto extends OmitType(CreateMovieDto, [
  'genreIds',
] as const) {}
