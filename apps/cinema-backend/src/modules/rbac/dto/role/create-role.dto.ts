import {
  IsNotEmpty,
  IsString,
  IsOptional,
  Length,
  Matches,
  MaxLength,
  IsArray,
  IsInt,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateRoleDto {
  @IsString({ message: 'Mã vai trò phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Mã vai trò không được để trống.' })
  @Length(3, 50, { message: 'Mã vai trò phải từ 3 đến 50 ký tự.' })
  @Matches(/^[A-Z0-9_]+$/, {
    message:
      'Mã vai trò chỉ được chứa chữ cái viết hoa, số và dấu gạch dưới (_).',
  })
  code: string;

  @IsString({ message: 'Tên hiển thị vai trò phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Tên hiển thị vai trò không được để trống.' })
  @Length(2, 100, { message: 'Tên hiển thị vai trò phải từ 2 đến 100 ký tự.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)) // Bỏ khoảng trắng thừa
  name: string;

  @IsOptional()
  @IsString({ message: 'Mô tả vai trò phải là chuỗi ký tự.' })
  @MaxLength(255, { message: 'Mô tả vai trò không được vượt quá 255 ký tự.' })
  description?: string;

  @IsOptional()
  @IsArray({ message: 'Danh sách mã quyền (permissionIds) phải là một mảng.' })
  @IsInt({ each: true, message: 'Mỗi mã quyền trong mảng phải là số nguyên.' })
  permissionIds?: number[];
}
