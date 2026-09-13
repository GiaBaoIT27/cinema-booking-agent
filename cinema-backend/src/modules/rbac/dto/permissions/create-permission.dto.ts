import {
  IsNotEmpty,
  IsString,
  IsOptional,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePermissionDto {
  @IsString({ message: 'Mã quyền hạn phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Mã quyền hạn không được để trống.' })
  @Length(5, 100, { message: 'Mã quyền hạn phải từ 5 đến 100 ký tự.' })
  @Matches(/^[a-z_]+:[a-z_]+$/, {
    message:
      'Mã quyền hạn không hợp lệ. Bắt buộc phải là chữ thường theo định dạng resource:action (Ví dụ: ticket:refund).',
  })
  code: string;

  @IsString({ message: 'Tên hiển thị quyền hạn phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Tên hiển thị quyền hạn không được để trống.' })
  @Length(2, 100, {
    message: 'Tên hiển thị quyền hạn phải từ 2 đến 100 ký tự.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string; // Tách biệt bổ sung phục vụ UI

  @IsString({ message: 'Nhóm chức năng (module) phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Nhóm chức năng không được để trống.' })
  @Length(2, 50, { message: 'Nhóm chức năng phải từ 2 đến 50 ký tự.' })
  @Matches(/^[A-Z_]+$/, {
    message:
      'Nhóm chức năng không hợp lệ. Bắt buộc phải viết hoa toàn bộ và không chứa khoảng trắng (Ví dụ: INVENTORY).',
  })
  module: string;

  @IsOptional()
  @IsString({ message: 'Mô tả quyền hạn phải là chuỗi ký tự.' })
  @MaxLength(255, { message: 'Mô tả quyền hạn không được vượt quá 255 ký tự.' })
  description?: string;
}
