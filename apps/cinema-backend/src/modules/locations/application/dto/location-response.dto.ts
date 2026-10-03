import { ProvinceType } from '../../domain/enums/province-type.enum.js';
import { WardType } from '../../domain/enums/ward-type.enum.js';

export class ProvinceResponseDto {
  id: number;
  code: string;
  name: string;
  type: ProvinceType;
  createdAt?: Date;
}

export class WardResponseDto {
  id: number;
  provinceId: number;
  provinceName?: string;
  code: string;
  name: string;
  type: WardType;
  createdAt?: Date;
}

export interface PaginationMetaDto {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface PagedResultDto<T> {
  data: T[];
  pagination: PaginationMetaDto;
}

export interface ProvinceWardsPageDto extends PagedResultDto<WardResponseDto> {
  meta: {
    provinceInfo: { id: number; code: string; name: string };
  };
}
