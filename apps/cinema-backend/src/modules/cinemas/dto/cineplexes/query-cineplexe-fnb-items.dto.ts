import { IsEnum, IsOptional } from 'class-validator';

export enum FnbCategory {
  POPCORN = 'POPCORN',
  BEVERAGE = 'BEVERAGE',
  SNACK = 'SNACK',
  COMBO = 'COMBO',
}

export class GetFnbItemsQueryDto {
  @IsOptional()
  @IsEnum(FnbCategory, {
    message:
      'Category phải thuộc một trong các giá trị: POPCORN, BEVERAGE, SNACK, COMBO',
  })
  category?: FnbCategory;
}
