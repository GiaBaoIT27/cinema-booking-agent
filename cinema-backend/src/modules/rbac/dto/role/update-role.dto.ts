import {
  IsNotEmpty,
  IsString,
  IsOptional,
  Length,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateRoleDto {
  @IsString({ message: 'Tên hiển thị vai trò phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Tên hiển thị vai trò không được để trống.' })
  @Length(2, 100, { message: 'Tên hiển thị vai trò phải từ 2 đến 100 ký tự.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @IsOptional()
  @IsString({ message: 'Mô tả vai trò phải là chuỗi ký tự.' })
  @MaxLength(255, { message: 'Mô tả vai trò không được vượt quá 255 ký tự.' })
  description?: string;
}
