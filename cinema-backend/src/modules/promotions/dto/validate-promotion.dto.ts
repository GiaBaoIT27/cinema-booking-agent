import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class ValidatePromotionDto {
  @IsNotEmpty({ message: 'Mã khuyến mãi không được để trống' })
  @IsString({ message: 'Mã khuyến mãi phải là chuỗi ký tự' })
  @Transform(({ value }) => value?.trim().toUpperCase())
  code: string;

  @IsNotEmpty({ message: 'Giá trị đơn hàng không được để trống' })
  @IsNumber({}, { message: 'Giá trị đơn hàng orderAmount phải là kiểu số' })
  @Min(0, { message: 'Giá trị đơn hàng phải lớn hơn hoặc bằng 0' })
  orderAmount: number;
}
