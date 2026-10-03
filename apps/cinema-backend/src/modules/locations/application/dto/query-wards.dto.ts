import { IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '#src/common/dto/pagination.dto.js';
import { WardType } from '../../domain/enums/ward-type.enum.js';

export class QueryWardsDto extends PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'provinceId phải là số nguyên' })
  @Min(1, { message: 'provinceId phải lớn hơn hoặc bằng 1' })
  provinceId?: number;

  @IsOptional()
  @IsEnum(WardType, { message: 'type phải là WARD hoặc COMMUNE' })
  type?: WardType;
}
