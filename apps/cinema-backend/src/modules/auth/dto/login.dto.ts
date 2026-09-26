import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString({ message: 'Tài khoản phải là chuỗi ký tự' })
  @IsNotEmpty({
    message: 'Tài khoản (email hoặc số điện thoại) không được để trống',
  })
  username: string;

  @IsNotEmpty({ message: 'Mật khẩu tài khoản không được để trống' })
  @MinLength(8, { message: 'Mật khẩu phải chứa ít nhất 8 ký tự' })
  password: string;
}
