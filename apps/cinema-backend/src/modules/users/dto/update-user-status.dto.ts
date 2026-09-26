import {
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsString,
  ValidateIf,
  Length,
} from 'class-validator';
import { UserStatus } from '../enums/user-status.enum.js';

export class UpdateUserStatusDto {
  @IsNotEmpty({ message: 'Trạng thái tài khoản không được để trống.' })
  @IsEnum(UserStatus, {
    message: 'Trạng thái tài khoản không hợp lệ (ACTIVE, UNVERIFIED, BLOCKED).',
  })
  status: UserStatus;

  // Tự động kích hoạt kiểm tra bắt buộc nhập nếu status được truyền lên là BLOCKED
  @ValidateIf((o) => o.status === UserStatus.BLOCKED)
  @IsNotEmpty({
    message:
      'Lý do khóa tài khoản (reason) là bắt buộc khi cập nhật trạng thái BLOCKED.',
  })
  @IsString({ message: 'Lý do thay đổi trạng thái phải là chuỗi ký tự.' })
  @Length(10, 500, {
    message:
      'Lý do khóa tài khoản phải từ 10 đến 500 ký tự để phục vụ hậu kiểm.',
  })
  reason?: string;
}
