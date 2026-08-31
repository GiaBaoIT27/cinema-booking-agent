import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProvinceType } from '../enums/province-type.enum.js';

export class FilterProvinceDto {
  @IsOptional()
  @IsEnum(ProvinceType)
  type?: ProvinceType;

  @IsOptional()
  @IsString()
  search?: string;
}
