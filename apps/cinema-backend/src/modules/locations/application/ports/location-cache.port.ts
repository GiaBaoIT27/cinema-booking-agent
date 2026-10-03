import type { ProvinceSearchOptions } from '../../domain/repositories/province.repository.interface.js';
import type { WardSearchOptions } from '../../domain/repositories/ward.repository.interface.js';
import type {
  ProvinceResponseDto,
  WardResponseDto,
  PagedResultDto,
} from '../dto/location-response.dto.js';

/**
 * Port cache cho địa giới hành chính. Application chỉ biết "cái gì được cache",
 * còn key, TTL và cơ chế xóa theo pattern thuộc về infrastructure.
 */
export interface ILocationCache {
  getProvincePage(
    options: ProvinceSearchOptions,
    loader: () => Promise<PagedResultDto<ProvinceResponseDto>>,
  ): Promise<PagedResultDto<ProvinceResponseDto>>;

  getWardPage(
    options: WardSearchOptions,
    loader: () => Promise<PagedResultDto<WardResponseDto>>,
  ): Promise<PagedResultDto<WardResponseDto>>;

  getProvinceSummary(
    id: string,
    loader: () => Promise<ProvinceResponseDto | null>,
  ): Promise<ProvinceResponseDto | null>;

  getWardSummary(
    id: string,
    loader: () => Promise<WardResponseDto | null>,
  ): Promise<WardResponseDto | null>;

  getAllProvinceSummaries(
    loader: () => Promise<ProvinceResponseDto[]>,
  ): Promise<ProvinceResponseDto[]>;

  /** Xóa toàn bộ cache địa giới (gọi sau mọi thao tác ghi) */
  invalidateAll(): Promise<void>;
}

export const LOCATION_CACHE = Symbol('LOCATION_CACHE');
