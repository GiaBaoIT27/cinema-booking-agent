import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { MovieStatus } from '../enums/movie-status.enum.js';

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalElements: number;
    totalPages: number;
  };
}

export class GetMoviesQueryDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @IsOptional()
  @IsEnum(MovieStatus, {
    message: 'Trạng thái phim không hợp lệ (UPCOMING, SHOWING, ENDED)',
  })
  status?: MovieStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'genre_id phải là số nguyên' })
  @Min(1)
  genre_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Trang phải lớn hơn hoặc bằng 1' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100, { message: 'Kích thước trang tối đa là 100' })
  limit: number = 10;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z_]+:(asc|desc)$/i, {
    message: 'Định dạng sort không hợp lệ. Ví dụ: release_date:desc, title:asc',
  })
  sort: string = 'release_date:desc';
}
