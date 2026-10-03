import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum MovieStatusFilter {
  COMING_SOON = 'UPCOMING',
  NOW_SHOWING = 'SHOWING',
  ENDED = 'ENDED',
}

export class GetDistributorMoviesQueryDto {
  @IsOptional()
  @IsEnum(MovieStatusFilter, {
    message: 'status phải là UPCOMING, SHOWING hoặc ENDED',
  })
  status?: MovieStatusFilter;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'page phải lớn hơn hoặc bằng 1' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'limit phải lớn hơn hoặc bằng 1' })
  @Max(100, { message: 'limit tối đa là 100' })
  limit: number = 20;
}
