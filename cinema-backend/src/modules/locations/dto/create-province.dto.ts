import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ProvinceType } from '../enums/province-type.enum.js';

export class CreateProvinceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsEnum(ProvinceType)
  @IsNotEmpty()
  type: ProvinceType;
}
