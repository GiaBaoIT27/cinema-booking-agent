import { Province } from '../../domain/entities/province.entity.js';
import { Ward } from '../../domain/entities/ward.entity.js';
import {
  ProvinceResponseDto,
  WardResponseDto,
  PagedResultDto,
} from '../dto/location-response.dto.js';

export function toProvinceResponse(province: Province): ProvinceResponseDto {
  return {
    id: Number(province.id),
    code: province.code,
    name: province.name,
    type: province.type,
    createdAt: province.createdAt,
  };
}

/** Bản rút gọn (không createdAt) – dùng cho facade / cache theo id */
export function toProvinceSummary(province: Province): ProvinceResponseDto {
  return {
    id: Number(province.id),
    code: province.code,
    name: province.name,
    type: province.type,
  };
}

/** provinceName chỉ có giá trị khi repository đã join `province` */
export function toWardResponse(ward: Ward): WardResponseDto {
  return {
    id: Number(ward.id),
    provinceId: Number(ward.provinceId),
    provinceName: ward.province?.name,
    code: ward.code,
    name: ward.name,
    type: ward.type,
    createdAt: ward.createdAt,
  };
}

export function toWardSummary(ward: Ward): WardResponseDto {
  return {
    id: Number(ward.id),
    provinceId: Number(ward.provinceId),
    code: ward.code,
    name: ward.name,
    type: ward.type,
  };
}

export function toPagedResult<T>(
  data: T[],
  totalItems: number,
  page: number,
  limit: number,
): PagedResultDto<T> {
  return {
    data,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit) || 1,
    },
  };
}
