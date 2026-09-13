import {
  IsNotEmpty,
  IsString,
  IsOptional,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdatePermissionDto {
  @IsString({ message: 'Tên hiển thị quyền hạn phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Tên hiển thị quyền hạn không được để trống.' })
  @Length(2, 100, {
    message: 'Tên hiển thị quyền hạn phải từ 2 đến 100 ký tự.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @IsString({ message: 'Nhóm chức năng (module) phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Nhóm chức năng không được để trống.' })
  @Length(2, 50, { message: 'Nhóm chức năng phải từ 2 đến 50 ký tự.' })
  @Matches(/^[A-Z_]+$/, {
    message:
      'Nhóm chức năng không hợp lệ. Bắt buộc phải viết hoa toàn bộ (Ví dụ: INVENTORY).',
  })
  module: string;

  @IsOptional()
  @IsString({ message: 'Mô tả quyền hạn phải là chuỗi ký tự.' })
  @MaxLength(255, { message: 'Mô tả quyền hạn không được vượt quá 255 ký tự.' })
  description?: string;
}
