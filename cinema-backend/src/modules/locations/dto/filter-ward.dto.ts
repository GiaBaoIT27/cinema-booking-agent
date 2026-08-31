import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { WardType } from '../enums/ward-type.enum.js';

export class FilterWardDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  provinceId?: string;

  @IsOptional()
  @IsEnum(WardType)
  type?: WardType;

  @IsOptional()
  @IsString()
  search?: string;
}
