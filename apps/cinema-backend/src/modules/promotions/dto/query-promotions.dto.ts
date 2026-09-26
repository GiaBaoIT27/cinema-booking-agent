import {
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { DiscountType } from '../enums/promotion.enum.js';

export class GetPromotionsQueryDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  code?: string;

  @IsOptional()
  @IsEnum(DiscountType, {
    message: 'discountType phải là PERCENTAGE hoặc FIXED_AMOUNT',
  })
  discountType?: DiscountType;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'page phải lớn hơn hoặc bằng 1' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'limit phải lớn hơn hoặc bằng 1' })
  @Max(100, { message: 'limit tối đa là 100' })
  limit: number = 20;
}
