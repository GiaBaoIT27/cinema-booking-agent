import { FnbItem } from '../entities/fnb-item.entities.js';
import { FnbCategory } from '../enums/fnb-category.enum.js';
import { FnbItemType } from '../enums/fnb-item-type.enum.js';

/** Bộ lọc truy vấn danh sách món F&B (GET /api/v1/fnb-items) */
export interface FnbItemFilters {
  category?: FnbCategory;
  type?: FnbItemType;
  isActive?: boolean;
  keyword?: string;
  page: number;
  limit: number;
}

/** Kết quả truy vấn phân trang – trả về kèm tổng số để service tự tính totalPages */
export interface FnbItemPageResult {
  items: FnbItem[];
  totalItems: number;
}

export interface IFnbRepository {
  /** Lấy toàn bộ món F&B (không phân trang) */
  findAll(): Promise<FnbItem[]>;

  /** Lấy danh sách món F&B theo bộ lọc + phân trang */
  findMany(filters: FnbItemFilters): Promise<FnbItemPageResult>;

  findById(id: string): Promise<FnbItem | null>;

  /** Lấy nhiều món theo danh sách ID (dùng cho facade/lưu snapshot giá) */
  findByIds(ids: string[]): Promise<FnbItem[]>;

  /** Lấy các món đang kinh doanh (isActive = true), có thể lọc theo nhóm món */
  findActive(category?: string): Promise<FnbItem[]>;

  existsById(id: string): Promise<boolean>;

  /** Kiểm tra SKU đã tồn tại chưa (excludeId để loại trừ chính nó khi update) */
  existsBySku(sku: string, excludeId?: string): Promise<boolean>;

  /** Kiểm tra tên món đã tồn tại chưa (excludeId để loại trừ chính nó khi update) */
  existsByName(name: string, excludeId?: string): Promise<boolean>;

  create(data: Partial<FnbItem>): FnbItem;

  save(fnbItem: FnbItem): Promise<FnbItem>;

  deleteById(id: string): Promise<void>;
}

export const FNB_REPOSITORY = Symbol('FNB_REPOSITORY');
