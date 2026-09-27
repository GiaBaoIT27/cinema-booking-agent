import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectionType } from '../enums/projection-type.enum.js';
import { ShowtimeStatus } from '../enums/showtime-status.enum.js';

export class GetShowtimesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'movieId phải là số nguyên' })
  movieId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'cineplexId phải là số nguyên' })
  cineplexId?: number;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'Định dạng ngày không hợp lệ (định dạng đúng: YYYY-MM-DD)' },
  )
  date?: string;

  @IsOptional()
  @IsEnum(ProjectionType, {
    message: 'Loại chiếu không hợp lệ (2D, 3D, 4DX, IMAX)',
  })
  projectionType?: ProjectionType;

  @IsOptional()
  @IsEnum(ShowtimeStatus, {
    message:
      'Trạng thái suất chiếu không hợp lệ (SCHEDULED, OPEN, CLOSED, CANCELLED)',
  })
  status?: ShowtimeStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Trang phải lớn hơn hoặc bằng 1' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Số lượng bản ghi tối thiểu là 1' })
  @Max(100, { message: 'Số lượng bản ghi tối đa là 100' })
  limit: number = 20;
}
