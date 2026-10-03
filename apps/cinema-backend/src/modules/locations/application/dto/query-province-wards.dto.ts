import { IsOptional, IsEnum } from 'class-validator';
import { PaginationDto } from '#src/common/dto/pagination.dto.js';
import { WardType } from '../../domain/enums/ward-type.enum.js';

export class QueryProvinceWardsDto extends PaginationDto {
  @IsOptional()
  @IsEnum(WardType, { message: 'Type phải là WARD hoặc COMMUNE' })
  type?: WardType;
}
