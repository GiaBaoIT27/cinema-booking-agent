export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export interface ResponseMeta {
  timestamp: string;
  requestId: string;
  path: string;
}

export interface PaginationMeta extends ResponseMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// DTO cho phản hồi thành công
export class ApiResponseDto<T = any> {
  success: boolean = true;
  code: number;
  message: string;
  data: T | null = null;
  meta: ResponseMeta | PaginationMeta;
}

// DTO cho phản hồi lỗi
export class ErrorResponseDto {
  success: boolean = false;
  code: number;
  errorCode: string;
  message: string;
  errors?: ValidationErrorDetail[];
  meta: ResponseMeta;
}
