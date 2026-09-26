import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsInt,
  IsBoolean,
  IsISO8601,
  Length,
  Matches,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { DiscountType } from '../enums/promotion.enum.js';

export class CreatePromotionDto {
  @IsString()
  @Length(6, 50, { message: 'Mã code phải có độ dài từ 6 đến 50 ký tự' })
  @Matches(/^[A-Z0-9]+$/, {
    message:
      'Mã code chỉ được chứa chữ cái in hoa và chữ số (viết hoa toàn bộ)',
  })
  @Transform(({ value }) => value?.trim().toUpperCase())
  code: string;

  @IsOptional()
  @IsEnum(DiscountType, {
    message: 'discountType phải là PERCENTAGE hoặc FIXED_AMOUNT',
  })
  discountType?: DiscountType = DiscountType.FIXED_AMOUNT;

  @IsNumber({}, { message: 'discountValue phải là kiểu số' })
  @Min(0.01, { message: 'Giá trị giảm phải lớn hơn 0' })
  discountValue: number;

  @IsOptional()
  @IsNumber({}, { message: 'maxDiscountAmount phải là kiểu số' })
  @Min(0, { message: 'maxDiscountAmount không được âm' })
  maxDiscountAmount?: number;

  @IsOptional()
  @IsNumber({}, { message: 'minOrderAmount phải là kiểu số' })
  @Min(0, { message: 'minOrderAmount không được âm' })
  minOrderAmount?: number = 0;

  @IsOptional()
  @IsInt({ message: 'usageLimit phải là số nguyên' })
  @Min(1, { message: 'usageLimit phải lớn hơn hoặc bằng 1' })
  usageLimit?: number;

  @IsISO8601(
    {},
    { message: 'startDate phải là chuỗi thời gian chuẩn ISO 8601 UTC' },
  )
  startDate: string;

  @IsISO8601(
    {},
    { message: 'endDate phải là chuỗi thời gian chuẩn ISO 8601 UTC' },
  )
  endDate: string;

  @IsOptional()
  @IsBoolean({ message: 'isActive phải là boolean (true/false)' })
  isActive?: boolean = true;
}
