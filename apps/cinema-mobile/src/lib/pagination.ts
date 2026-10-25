import type { ApiResponse } from "@/types/api.type";

export type Pagination = NonNullable<ApiResponse<unknown>["pagination"]>;

export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

type RawList<T> =
  | (T[] & { pagination?: Pagination })
  | { data?: T[]; pagination?: Pagination }
  | null
  | undefined;

/** apiClient trả mảng có gắn .pagination, hoặc { data, pagination }: chuẩn hóa về một dạng. */
export function toPaginated<T>(
  raw: RawList<T>,
  fallback: { page?: number; limit?: number } = {},
): Paginated<T> {
  const items = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
      ? raw.data
      : [];
  const pagination = (Array.isArray(raw) ? raw.pagination : raw?.pagination) ?? {
    page: fallback.page ?? 1,
    limit: fallback.limit ?? items.length,
    totalItems: items.length,
    totalPages: 1,
  };
  return { items, pagination };
}
