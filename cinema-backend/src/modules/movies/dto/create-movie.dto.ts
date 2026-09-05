import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { MovieAgeRating } from '../enums/movie-age-rating.enum.js';
import { MovieStatus } from '../enums/movie-status.enum.js';

export class CreateMovieDto {
  @IsNotEmpty()
  @IsString()
  distributorId: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  originalTitle?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  director?: string;

  @IsOptional()
  @IsString()
  cast?: string;

  @IsInt()
  @Min(1)
  durationMinutes: number;

  @IsEnum(MovieAgeRating)
  ageRating: MovieAgeRating;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  originalLanguage?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  revenueShareRatio: number;

  @IsOptional()
  @IsString()
  trailerUrl?: string;

  @IsOptional()
  @IsString()
  posterUrl?: string;

  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @IsDateString()
  releaseDate: Date;

  @IsDateString()
  endDate: Date;

  @IsOptional()
  @IsEnum(MovieStatus)
  status?: MovieStatus;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  genreIds: string[];
}
