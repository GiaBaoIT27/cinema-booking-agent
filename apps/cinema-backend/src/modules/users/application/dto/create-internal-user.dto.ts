import {
  IsNotEmpty,
  IsEmail,
  IsString,
  IsOptional,
  Length,
  Matches,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInternalUserDto {
  @IsString({ message: 'Họ và tên phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Họ và tên không được để trống.' })
  @Length(2, 150, { message: 'Họ và tên phải từ 2 đến 150 ký tự.' })
  fullName: string;

  @IsEmail({}, { message: 'Định dạng email không hợp lệ.' })
  @IsNotEmpty({ message: 'Email không được để trống.' })
  email: string;

  @IsNotEmpty({ message: 'Số điện thoại không được để trống.' })
  @Matches(/^(0[3|5|7|8|9])+([0-9]{8})\b/, {
    message: 'Số điện thoại không đúng định dạng Việt Nam.',
  })
  phoneNumber: string;

  @IsNotEmpty({ message: 'Mật khẩu không được để trống.' })
  @Length(8, 64, { message: 'Mật khẩu khởi tạo phải từ 8 đến 64 ký tự.' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'Mật khẩu phải chứa ít nhất một chữ hoa, một chữ thường và một số.',
  })
  password: string;

  @Type(() => Number)
  @IsInt({ message: 'Mã vai trò (roleId) phải là số nguyên.' })
  @IsNotEmpty({ message: 'Mã vai trò không được để trống.' })
  roleId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Mã cụm rạp (cineplexId) phải là số nguyên.' })
  cineplexId?: number;
}
