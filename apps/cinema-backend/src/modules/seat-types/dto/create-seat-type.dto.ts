import {
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  IsNumber,
  Min,
  Max,
  IsInt,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSeatTypeDto {
  @IsNotEmpty({ message: 'Mã loại ghế không được để trống' })
  @IsString({ message: 'Mã loại ghế phải là chuỗi' })
  @Length(2, 20, { message: 'Mã loại ghế phải có độ dài từ 2 đến 20 ký tự' })
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'Mã loại ghế phải ở định dạng UPPER_SNAKE_CASE (VD: ROYAL_BED)',
  })
  code: string;

  @IsNotEmpty({ message: 'Tên loại ghế không được để trống' })
  @IsString({ message: 'Tên loại ghế phải là chuỗi' })
  @Length(2, 50, { message: 'Tên loại ghế phải có độ dài từ 2 đến 50 ký tự' })
  name: string;

  @IsNotEmpty({ message: 'Hệ số giá không được để trống' })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Hệ số giá phải là số thập phân tối đa 2 chữ số' },
  )
  @Min(1.0, { message: 'Hệ số giá tối thiểu phải từ 1.00' })
  @Max(10.0, { message: 'Hệ số giá tối đa là 10.00' })
  priceMultiplier: number;

  @IsNotEmpty({ message: 'Số tiền phụ thu không được để trống' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Số tiền phụ thu phải là số hợp lệ' })
  @Min(0.0, { message: 'Số tiền phụ thu phải lớn hơn hoặc bằng 0.00' })
  surchargeAmount: number;

  @IsNotEmpty({ message: 'Mã màu Hex không được để trống' })
  @IsString({ message: 'Mã màu phải là chuỗi' })
  @Matches(/^#([A-Fa-f0-9]{6})$/, {
    message: 'Mã màu phải đúng định dạng Hex Color (Ví dụ: #17A2B8)',
  })
  colorCode: string;

  @IsNotEmpty({ message: 'Số chỗ ngồi không được để trống' })
  @Type(() => Number)
  @IsInt({ message: 'Số chỗ ngồi phải là số nguyên' })
  @Min(1, { message: 'Số chỗ ngồi tối thiểu là 1' })
  @Max(4, { message: 'Số chỗ ngồi tối đa là 4' })
  seatCount: number;

  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi' })
  @MaxLength(255, { message: 'Mô tả tối đa 255 ký tự' })
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Thứ tự hiển thị phải là số nguyên' })
  displayOrder: number = 1;
}
