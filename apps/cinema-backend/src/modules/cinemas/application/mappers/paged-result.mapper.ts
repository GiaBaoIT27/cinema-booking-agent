import { PagedResultDto } from '../dto/paged-result.dto.js';

export function toPagedResult<T>(
  items: T[],
  totalItems: number,
  page: number,
  limit: number,
): PagedResultDto<T> {
  return {
    items,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      totalItems,
      totalPages: Math.ceil(totalItems / limit) || 1,
    },
  };
}
