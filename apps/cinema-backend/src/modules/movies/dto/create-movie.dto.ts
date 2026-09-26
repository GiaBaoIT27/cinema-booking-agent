import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ArrayMinSize,
  Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { AgeRating } from '../enums/movie-age-rating.enum.js';

export class CreateMovieDto {
  @IsNotEmpty({ message: 'distributorId không được để trống' })
  @Type(() => Number)
  @IsInt({ message: 'distributorId phải là số nguyên' })
  @Min(1)
  distributorId: number;

  @IsNotEmpty({ message: 'Tên phim không được để trống' })
  @IsString()
  @MaxLength(255, { message: 'Tên phim không vượt quá 255 ký tự' })
  @Transform(({ value }) => value?.trim())
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  originalTitle?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  director?: string;

  @IsOptional()
  @IsString()
  cast?: string;

  @IsNotEmpty({ message: 'Thời lượng phim không được để trống' })
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Thời lượng phim phải lớn hơn 0' })
  durationMinutes: number;

  @IsNotEmpty({ message: 'Phân loại độ tuổi không được để trống' })
  @IsEnum(AgeRating, {
    message: 'Phân loại độ tuổi không hợp lệ (P, K, T13, T16, T18)',
  })
  ageRating: AgeRating;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  originalLanguage?: string;

  @IsNotEmpty({ message: 'Tỷ lệ chia sẻ doanh thu không được để trống' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.0, { message: 'Tỷ lệ chia sẻ doanh thu phải từ 0.00 đến 100.00' })
  @Max(100.0, { message: 'Tỷ lệ chia sẻ doanh thu phải từ 0.00 đến 100.00' })
  revenueShareRatio: number;

  @IsOptional()
  @IsUrl({}, { message: 'trailerUrl không đúng định dạng URL' })
  @MaxLength(500)
  trailerUrl?: string;

  @IsOptional()
  @IsUrl({}, { message: 'posterUrl không đúng định dạng URL' })
  @MaxLength(500)
  posterUrl?: string;

  @IsOptional()
  @IsUrl({}, { message: 'bannerUrl không đúng định dạng URL' })
  @MaxLength(500)
  bannerUrl?: string;

  @IsNotEmpty({ message: 'Ngày khởi chiếu không được để trống' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'releaseDate phải đúng định dạng YYYY-MM-DD',
  })
  releaseDate: string;

  @IsNotEmpty({ message: 'Ngày kết thúc không được để trống' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'endDate phải đúng định dạng YYYY-MM-DD',
  })
  endDate: string;

  @IsNotEmpty({ message: 'Danh sách thể loại không được để trống' })
  @IsArray()
  @ArrayMinSize(1, { message: 'Phim phải có ít nhất 1 thể loại' })
  @IsInt({ each: true, message: 'Mỗi genreId phải là số nguyên' })
  genreIds: number[];
}
