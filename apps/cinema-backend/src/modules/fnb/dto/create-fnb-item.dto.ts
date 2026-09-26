import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsUrl,
  Length,
  Matches,
  Min,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { FnbItemType } from '../enums/fnb-item-type.enum.js';
import { FnbCategory } from '../enums/fnb-category.enum.js';

export class CreateFnbItemDto {
  @IsNotEmpty({ message: 'Mã SKU không được để trống' })
  @IsString({ message: 'Mã SKU phải là chuỗi' })
  @Length(3, 50, { message: 'Mã SKU phải có độ dài từ 3 đến 50 ký tự' })
  @Matches(/^[A-Z0-9-]+$/, {
    message:
      'SKU chỉ được bao gồm chữ cái in hoa, chữ số và dấu gạch ngang (-)',
  })
  sku: string;

  @IsNotEmpty({ message: 'Tên sản phẩm không được để trống' })
  @IsString({ message: 'Tên sản phẩm phải là chuỗi' })
  @Length(2, 150, { message: 'Tên sản phẩm phải có độ dài từ 2 đến 150 ký tự' })
  name: string;

  @IsNotEmpty({ message: 'Kiểu sản phẩm không được để trống' })
  @IsEnum(FnbItemType, { message: 'Kiểu sản phẩm phải là SINGLE hoặc COMBO' })
  type: FnbItemType;

  @IsNotEmpty({ message: 'Nhóm món không được để trống' })
  @IsEnum(FnbCategory, { message: 'Nhóm món không hợp lệ' })
  category: FnbCategory;

  @IsOptional()
  @IsString({ message: 'Đơn vị tính phải là chuỗi' })
  unit: string = 'PHẦN';

  @IsNotEmpty({ message: 'Giá bán niêm yết không được để trống' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Giá bán phải là số hợp lệ' })
  @Min(0.0, { message: 'Giá bán niêm yết phải lớn hơn hoặc bằng 0' })
  basePrice: number;

  @IsOptional()
  @IsUrl({}, { message: 'Đường dẫn ảnh phải là URL hợp lệ' })
  @MaxLength(500, { message: 'Đường dẫn ảnh tối đa 500 ký tự' })
  imageUrl?: string;

  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi' })
  description?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return true;
  })
  @IsBoolean()
  isActive: boolean = true;
}
