export interface PaginationMetaDto {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface PagedResultDto<T> {
  items: T[];
  pagination: PaginationMetaDto;
}
