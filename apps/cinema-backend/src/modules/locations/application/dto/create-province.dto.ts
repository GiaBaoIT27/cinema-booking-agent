import {
  IsNotEmpty,
  IsString,
  Length,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ProvinceType } from '../../domain/enums/province-type.enum.js';

export class CreateProvinceDto {
  @IsNotEmpty({ message: 'Mã Tỉnh/Thành phố không được để trống' })
  @IsString({ message: 'Mã Tỉnh/Thành phố phải là chuỗi' })
  @Length(1, 10, { message: 'Mã Tỉnh/Thành phố phải từ 1 đến 10 ký tự' })
  @Transform(({ value }) => value?.trim())
  code: string;

  @IsNotEmpty({ message: 'Tên Tỉnh/Thành phố không được để trống' })
  @IsString({ message: 'Tên Tỉnh/Thành phố phải là chuỗi' })
  @Length(2, 255, { message: 'Tên Tỉnh/Thành phố phải từ 2 đến 255 ký tự' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsOptional()
  @IsEnum(ProvinceType, { message: 'INVALID_PROVINCE_TYPE' })
  type?: ProvinceType;
}
