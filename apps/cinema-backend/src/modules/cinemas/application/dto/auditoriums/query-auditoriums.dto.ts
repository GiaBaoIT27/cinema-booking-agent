import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ScreenType } from '../../../domain/enums/screen-type.enum.js';
import { AuditoriumStatus } from '../../../domain/enums/auditorium-status.enum.js';

/** Trạng thái phòng chiếu hoặc 'ALL' (không lọc). */
export type AuditoriumStatusFilter = AuditoriumStatus | 'ALL';

export const AUDITORIUM_STATUS_FILTERS: AuditoriumStatusFilter[] = [
  ...Object.values(AuditoriumStatus),
  'ALL',
];

export class QueryAuditoriumsDto {
  @IsOptional()
  @IsString()
  cineplexId?: string;

  @IsOptional()
  @IsEnum(ScreenType, {
    message: 'screenType phải thuộc loại STANDARD, IMAX, 4DX, GOLD_CLASS',
  })
  screenType?: ScreenType;

  @IsOptional()
  @IsIn(AUDITORIUM_STATUS_FILTERS, {
    message: 'status phải thuộc ACTIVE, MAINTENANCE, INACTIVE hoặc ALL',
  })
  status: AuditoriumStatusFilter = AuditoriumStatus.ACTIVE;

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
