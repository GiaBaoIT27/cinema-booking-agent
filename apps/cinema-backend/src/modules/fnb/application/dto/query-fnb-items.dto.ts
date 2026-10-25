import { IsEnum, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PaginationDto } from '#src/common/dto/pagination.dto.js';
import { FnbCategory } from '../../domain/enums/fnb-category.enum.js';
import { FnbItemType } from '../../domain/enums/fnb-item-type.enum.js';

export class GetFnbItemsDto extends PaginationDto {
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
