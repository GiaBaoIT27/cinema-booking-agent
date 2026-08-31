import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { WardType } from '../enums/ward-type.enum.js';

export class CreateWardDto {
  @IsNotEmpty()
  @IsString()
  provinceId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsEnum(WardType)
  @IsNotEmpty()
  type: WardType;
}
