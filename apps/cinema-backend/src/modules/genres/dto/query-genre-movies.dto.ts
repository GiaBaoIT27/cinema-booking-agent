import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { MovieStatus } from '#modules/movies/enums/movie-status.enum.js';

export class GetGenreMoviesQueryDto {
  @IsOptional()
  @IsEnum(MovieStatus, {
    message:
      'Trạng thái phim phải thuộc một trong các giá trị: UPCOMING, NOW_SHOWING, ENDED',
  })
  status?: MovieStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Trang phải là số nguyên' })
  @Min(1, { message: 'Trang tối thiểu là 1' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số lượng bản ghi phải là số nguyên' })
  @Min(1, { message: 'Số lượng bản ghi tối thiểu là 1' })
  @Max(100, { message: 'Số lượng bản ghi tối đa là 100' })
  limit: number = 20;
}
