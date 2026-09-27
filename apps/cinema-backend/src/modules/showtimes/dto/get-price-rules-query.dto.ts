import { IsOptional, IsInt, IsEnum, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { DayType } from '../enums/day-type.enum.js';
import { ProjectionType } from '../enums/projection-type.enum.js';

export class GetPriceRulesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'cineplex_id phải là số nguyên' })
  @Transform(({ value, obj }) => value ?? obj.cineplexId)
  cineplex_id?: number;

  @IsOptional()
  @IsEnum(ProjectionType, {
    message: 'projection_type không hợp lệ (2D, 3D, IMAX, 4DX)',
  })
  projection_type?: ProjectionType;

  @IsOptional()
  @IsEnum(DayType, {
    message: 'day_type không hợp lệ (WEEKDAY, WEEKEND, HOLIDAY)',
  })
  day_type?: DayType;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page phải là số nguyên' })
  @Min(1, { message: 'page phải lớn hơn hoặc bằng 1' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1, { message: 'limit phải lớn hơn hoặc bằng 1' })
  @Max(100, { message: 'limit tối đa là 100' })
  limit: number = 20;
}
