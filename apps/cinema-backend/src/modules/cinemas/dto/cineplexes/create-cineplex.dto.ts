import {
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCineplexDto {
  @IsNotEmpty({ message: 'Mã cụm rạp không được để trống' })
  @IsString({ message: 'Mã cụm rạp phải là chuỗi' })
  @Length(3, 50, { message: 'Mã cụm rạp có độ dài từ 3 đến 50 ký tự' })
  @Matches(/^[A-Z0-9_-]+$/, {
    message:
      'Mã cụm rạp phải viết hoa, không khoảng trắng và ký tự đặc biệt ngoài _ -',
  })
  code: string;

  @IsNotEmpty({ message: 'Tên cụm rạp không được để trống' })
  @IsString({ message: 'Tên cụm rạp phải là chuỗi' })
  @Length(3, 255, { message: 'Tên cụm rạp có độ dài từ 3 đến 255 ký tự' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsNotEmpty({ message: 'Mã Tỉnh/Thành phố không được để trống' })
  @IsNumber({}, { message: 'Mã Tỉnh/Thành phố phải là số nguyên' })
  @Transform(({ value }) => Number(value)) // Đảm bảo luôn là kiểu number khi vào Service
  provinceId: number;

  @IsNotEmpty({ message: 'Mã Xã/Phường không được để trống' })
  @IsNumber({}, { message: 'Mã Xã/Phường phải là số nguyên' })
  @Transform(({ value }) => Number(value)) // Đảm bảo luôn là kiểu number khi vào Service
  wardId: number;

  @IsNotEmpty({ message: 'Địa chỉ không được để trống' })
  @IsString({ message: 'Địa chỉ phải là chuỗi' })
  @Length(3, 500, { message: 'Địa chỉ có độ dài từ 3 đến 500 ký tự' })
  @Transform(({ value }) => value?.trim())
  address: string;

  @IsOptional()
  @IsNumber({}, { message: 'Vĩ độ phải là số thực' })
  @Min(-90.0, { message: 'Vĩ độ từ -90.0 đến 90.0' })
  @Max(90.0, { message: 'Vĩ độ từ -90.0 đến 90.0' })
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  latitude?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Kinh độ phải là số thực' })
  @Min(-180.0, { message: 'Kinh độ từ -180.0 đến 180.0' })
  @Max(180.0, { message: 'Kinh độ từ -180.0 đến 180.0' })
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  longitude?: number;

  @IsOptional()
  @IsString({ message: 'Số điện thoại phải là chuỗi' })
  @Matches(/^(0|84)[3|5|7|8|9][0-9]{8}$/, {
    message: 'Số điện thoại không đúng định dạng chuẩn Việt Nam',
  })
  phoneNumber?: string;
}
