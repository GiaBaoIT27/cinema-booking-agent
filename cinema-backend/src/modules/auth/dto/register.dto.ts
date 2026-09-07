import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MaxLength,
  Validate,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @IsString({ message: 'Họ và tên phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Họ và tên không được để trống.' })
  @Length(2, 150, { message: 'Họ và tên phải từ 2 đến 150 ký tự.' })
  fullName: string;

  @IsEmail({}, { message: 'Định dạng email đăng ký không hợp lệ.' })
  @IsNotEmpty({ message: 'Email không được để trống.' })
  @MaxLength(100, { message: 'Email không được vượt quá 100 ký tự.' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  ) // Tự động về lowercase [1.1]
  email: string;

  @IsNotEmpty({ message: 'Số điện thoại không được để trống.' })
  @Matches(/^(0[3|5|7|8|9])+([0-9]{8})\b/, {
    message: 'Số điện thoại không đúng định dạng.',
  })
  phoneNumber: string;

  @IsNotEmpty({ message: 'Mật khẩu không được để trống.' })
  @Length(8, 64, { message: 'Mật khẩu phải từ 8 ký tự.' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'Mật khẩu bắt buộc phải chứa ít nhất một chữ hoa, một chữ thường và một ký số.',
  })
  password: string;

  @IsNotEmpty({ message: 'Ngày sinh không được để trống.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Ngày sinh phải tuân theo định dạng YYYY-MM-DD.',
  })
  @Transform(({ value }) => {
    if (!value) return value;
    const inputDate = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Đưa về mốc 0h ngày hôm nay

    if (isNaN(inputDate.getTime()) || inputDate >= today) {
      throw new Error('Ngày sinh bắt buộc phải nhỏ hơn ngày hiện tại.');
    }
    return value;
  })
  dateOfBirth: string;
}
