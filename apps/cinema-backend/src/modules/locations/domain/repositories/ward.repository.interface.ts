import { Ward } from '../entities/ward.entity.js';
import { WardType } from '../enums/ward-type.enum.js';

export interface WardSearchOptions {
  page: number;
  limit: number;
  provinceId?: string;
  type?: WardType;
  keyword?: string;
}

export interface IWardRepository {
  findById(id: string): Promise<Ward | null>;

  /** Danh sách xã/phường kèm thông tin tỉnh (ward.province), sắp theo id */
  findPage(
    options: WardSearchOptions,
  ): Promise<{ items: Ward[]; total: number }>;

  /** Danh sách xã/phường của một tỉnh (không join tỉnh), sắp theo tên */
  findPageByProvince(
    provinceId: string,
    options: Omit<WardSearchOptions, 'provinceId'>,
  ): Promise<{ items: Ward[]; total: number }>;

  existsByCode(code: string): Promise<boolean>;

  create(data: Partial<Ward>): Ward;

  /** @throws UniqueViolationError khi trùng code ở tầng DB */
  save(ward: Ward): Promise<Ward>;
}

export const WARD_REPOSITORY = Symbol('WARD_REPOSITORY');
