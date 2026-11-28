/** Phân trang backend không đồng nhất: phần lớn dùng totalItems, module users dùng totalElements. */
export interface RawPagination {
  page?: number;
  limit?: number;
  totalItems?: number;
  totalElements?: number;
  totalPages?: number;
}

export interface PageResult<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
}

/**
 * apiClient trả về mảng `data` kèm thuộc tính ẩn `pagination`; một số API lại trả `{ data, pagination }`.
 */
export function toPageResult<T>(raw: unknown, limit: number): PageResult<T> {
  let items: T[] = [];
  let pagination: RawPagination | undefined;
  if (Array.isArray(raw)) {
    items = raw as T[];
    pagination = (raw as { pagination?: RawPagination }).pagination;
  } else if (raw && typeof raw === "object" && Array.isArray((raw as { data?: unknown }).data)) {
    items = (raw as { data: T[] }).data;
    pagination = (raw as { pagination?: RawPagination }).pagination;
  }
  const totalItems = pagination?.totalItems ?? pagination?.totalElements ?? items.length;
  const totalPages = pagination?.totalPages || Math.max(1, Math.ceil(totalItems / limit));
  return { items, totalItems, totalPages: Math.max(1, totalPages) };
}

export const formatVnd = (n: number | string) =>
  `${Number(n).toLocaleString("vi-VN")} ₫`;
