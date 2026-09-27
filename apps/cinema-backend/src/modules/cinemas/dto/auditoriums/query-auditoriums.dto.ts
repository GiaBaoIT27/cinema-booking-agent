import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ScreenType } from '#modules/cinemas/enums/screen-type.enum.js';
import { AuditoriumStatus } from '#modules/cinemas/enums/auditorium-status.enum.js';

export enum AuditoriumStatusFilter {
  ACTIVE = AuditoriumStatus.ACTIVE,
  MAINTENANCE = AuditoriumStatus.MAINTENANCE,
  INACTIVE = AuditoriumStatus.INACTIVE,
  ALL = 'ALL',
}

export class GetAuditoriumsQueryDto {
  @IsOptional()
  @IsString()
  cineplexId?: string;

  @IsOptional()
  @IsEnum(ScreenType, {
    message: 'screenType phải thuộc loại STANDARD, IMAX, 4DX, GOLD_CLASS',
  })
  screenType?: ScreenType;

  @IsOptional()
  @IsEnum(AuditoriumStatusFilter, {
    message: 'status phải thuộc ACTIVE, MAINTENANCE, INACTIVE hoặc ALL',
  })
  status: AuditoriumStatusFilter = AuditoriumStatusFilter.ACTIVE;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
