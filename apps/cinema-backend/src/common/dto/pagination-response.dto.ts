import { ApiResponseDto, PaginationMeta } from './base-response.dto.js';

export class PaginatedResponseDto<T> extends ApiResponseDto<T[]> {
  declare meta: PaginationMeta;

  /**
   * Factory method — nơi DUY NHẤT tính toán totalPages/hasNextPage,
   * tránh mỗi controller tự tính lại (dễ sai công thức).
   */
  static create<T>(
    items: T[],
    totalItems: number,
    page: number,
    limit: number,
    requestMeta: { requestId: string; path: string },
    message = 'Success',
  ): PaginatedResponseDto<T> {
    const totalPages = Math.ceil(totalItems / limit);

    const dto = new PaginatedResponseDto<T>();
    dto.success = true;
    dto.code = 200;
    dto.message = message;
    dto.data = items;
    dto.meta = {
      timestamp: new Date().toISOString(),
      requestId: requestMeta.requestId,
      path: requestMeta.path,
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
    return dto;
  }
}
