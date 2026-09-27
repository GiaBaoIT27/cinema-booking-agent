import {
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsEnum,
  Matches,
  IsNumber,
  Min,
} from 'class-validator';
import { DayType } from '../enums/day-type.enum.js';
import { ProjectionType } from '../enums/projection-type.enum.js';

export class CreatePriceRuleDto {
  @IsOptional()
  @IsInt({ message: 'cineplexId phải là số nguyên' })
  cineplexId?: number;

  @IsNotEmpty({ message: 'projectionType không được để trống' })
  @IsEnum(ProjectionType, {
    message: 'projectionType không hợp lệ (2D, 3D, IMAX, 4DX)',
  })
  projectionType: ProjectionType;

  @IsNotEmpty({ message: 'dayType không được để trống' })
  @IsEnum(DayType, {
    message: 'dayType không hợp lệ (WEEKDAY, WEEKEND, HOLIDAY)',
  })
  dayType: DayType;

  @IsNotEmpty({ message: 'startTime không được để trống' })
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'startTime phải theo định dạng ISO Time (HH:mm:ss)',
  })
  startTime: string;

  @IsNotEmpty({ message: 'endTime không được để trống' })
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'endTime phải theo định dạng ISO Time (HH:mm:ss)',
  })
  endTime: string;

  @IsNotEmpty({ message: 'basePrice không được để trống' })
  @IsNumber({}, { message: 'basePrice phải là dạng số' })
  @Min(1000, { message: 'basePrice tối thiểu là 1,000.00 VND' })
  basePrice: number;
}
