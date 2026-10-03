import { Province } from '../entities/province.entity.js';
import { ProvinceType } from '../enums/province-type.enum.js';

export interface ProvinceSearchOptions {
  page: number;
  limit: number;
  type?: ProvinceType;
  keyword?: string;
}

export interface IProvinceRepository {
  findById(id: string): Promise<Province | null>;

  /** Toàn bộ tỉnh/thành, sắp xếp theo mã (phục vụ bộ lọc) */
  findAllOrderedByCode(): Promise<Province[]>;

  findPage(
    options: ProvinceSearchOptions,
  ): Promise<{ items: Province[]; total: number }>;

  existsById(id: string): Promise<boolean>;

  existsByCode(code: string): Promise<boolean>;

  existsByName(name: string): Promise<boolean>;

  create(data: Partial<Province>): Province;

  /** @throws UniqueViolationError khi trùng code/name ở tầng DB */
  save(province: Province): Promise<Province>;
}

export const PROVINCE_REPOSITORY = Symbol('PROVINCE_REPOSITORY');
