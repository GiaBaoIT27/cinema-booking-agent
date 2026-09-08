import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ProvinceType } from '../enums/province-type.enum.js';

export class GetProvincesQueryDto {
  @IsOptional()
  @IsEnum(ProvinceType, { message: 'Type phải là CITY hoặc PROVINCE' })
  type?: ProvinceType;

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
  @Max(250, { message: 'limit tối đa là 250' })
  limit: number = 100;
}
