import { IsOptional, IsEnum } from 'class-validator';
import { PaginationDto } from '#src/common/dto/pagination.dto.js';
import { ProvinceType } from '../../domain/enums/province-type.enum.js';

export class QueryProvincesDto extends PaginationDto {
  @IsOptional()
  @IsEnum(ProvinceType, { message: 'Type phải là CITY hoặc PROVINCE' })
  type?: ProvinceType;
}
