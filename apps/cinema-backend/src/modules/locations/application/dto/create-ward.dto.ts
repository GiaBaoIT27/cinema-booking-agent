import {
  IsNotEmpty,
  IsString,
  Length,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { WardType } from '../../domain/enums/ward-type.enum.js';

export class CreateWardDto {
  @IsNotEmpty({ message: 'provinceId không được để trống' })
  @Type(() => Number)
  @IsInt({ message: 'provinceId phải là số nguyên' })
  @Min(1, { message: 'provinceId phải lớn hơn hoặc bằng 1' })
  provinceId: number;

  @IsNotEmpty({ message: 'Mã Xã/Phường không được để trống' })
  @IsString({ message: 'Mã Xã/Phường phải là chuỗi' })
  @Length(1, 50, { message: 'Mã Xã/Phường phải từ 1 đến 50 ký tự' })
  @Transform(({ value }) => value?.trim())
  code: string;

  @IsNotEmpty({ message: 'Tên Xã/Phường không được để trống' })
  @IsString({ message: 'Tên Xã/Phường phải là chuỗi' })
  @Length(2, 255, { message: 'Tên Xã/Phường phải từ 2 đến 255 ký tự' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsNotEmpty({ message: 'Loại đơn vị hành chính không được để trống' })
  @IsEnum(WardType, { message: 'type phải là WARD hoặc COMMUNE' })
  type: WardType;
}
