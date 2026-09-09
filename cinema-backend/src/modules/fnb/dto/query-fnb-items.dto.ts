import { IsEnum, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { FnbCategory } from '../enums/fnb-category.enum.js';
import { FnbItemType } from '../enums/fnb-item-type.enum.js';

export class GetFnbItemsDto {
  @IsOptional()
  @IsEnum(FnbCategory, { message: 'Category không hợp lệ' })
  category?: FnbCategory;

  @IsOptional()
  @IsEnum(FnbItemType, { message: 'Type không hợp lệ' })
  type?: FnbItemType;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  keyword?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Page phải lớn hơn hoặc bằng 1' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Limit phải lớn hơn hoặc bằng 1' })
  @Max(100, { message: 'Limit tối đa là 100' })
  limit: number = 20;
}
