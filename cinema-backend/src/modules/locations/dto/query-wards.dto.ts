import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { WardType } from '../enums/ward-type.enum.js';

export class GetWardsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'provinceId phải là số nguyên' })
  @Min(1, { message: 'provinceId phải lớn hơn hoặc bằng 1' })
  provinceId?: number;

  @IsOptional()
  @IsEnum(WardType, { message: 'type phải là WARD hoặc COMMUNE' })
  type?: WardType;

  @IsOptional()
  @IsString()
  keyword?: string;

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
