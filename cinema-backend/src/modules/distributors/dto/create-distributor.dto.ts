import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  Length,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateDistributorDto {
  @IsNotEmpty({ message: 'Tên nhà phát hành không được để trống' })
  @IsString({ message: 'Tên nhà phát hành phải là chuỗi ký tự' })
  @Length(2, 255, { message: 'Tên nhà phát hành phải từ 2 đến 255 ký tự' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsNotEmpty({ message: 'Mã số thuế không được để trống' })
  @IsString({ message: 'Mã số thuế phải là chuỗi ký tự' })
  @Length(10, 50, { message: 'Mã số thuế phải từ 10 đến 50 ký tự' })
  @Matches(/^[0-9-]+$/, {
    message: 'Mã số thuế chỉ bao gồm chữ số và dấu gạch nối',
  })
  @Transform(({ value }) => value?.trim())
  taxCode: string;

  @IsNotEmpty({ message: 'Địa chỉ không được để trống' })
  @IsString({ message: 'Địa chỉ phải là chuỗi ký tự' })
  @Length(5, 500, { message: 'Địa chỉ phải từ 5 đến 500 ký tự' })
  @Transform(({ value }) => value?.trim())
  address: string;

  @IsNotEmpty({ message: 'Tên người liên hệ không được để trống' })
  @IsString({ message: 'Tên người liên hệ phải là chuỗi ký tự' })
  @Length(2, 255, { message: 'Tên người liên hệ phải từ 2 đến 255 ký tự' })
  @Transform(({ value }) => value?.trim())
  contactPerson: string;

  @IsNotEmpty({ message: 'Email liên hệ không được để trống' })
  @IsEmail({}, { message: 'Email liên hệ không đúng định dạng RFC 5322' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  contactEmail: string;

  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
  @Length(8, 20, { message: 'Số điện thoại phải từ 8 đến 20 ký tự' })
  @Matches(/^[0-9+() -]+$/, {
    message: 'Số điện thoại không hợp lệ',
  })
  @Transform(({ value }) => value?.trim())
  contactPhone: string;

  @IsOptional()
  @IsString({ message: 'Số tài khoản ngân hàng phải là chuỗi ký tự' })
  @Length(5, 50, { message: 'Số tài khoản ngân hàng phải từ 5 đến 50 ký tự' })
  @Transform(({ value }) => value?.trim())
  bankAccountNumber?: string;

  @IsOptional()
  @IsString({ message: 'Tên ngân hàng phải là chuỗi ký tự' })
  @Length(2, 100, { message: 'Tên ngân hàng phải từ 2 đến 100 ký tự' })
  @Transform(({ value }) => value?.trim())
  bankName?: string;
}
