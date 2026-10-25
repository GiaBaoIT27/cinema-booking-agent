export interface ApiResponse<T> {
  success: boolean;
  code: number;
  message: string;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    totalItems?: number;
    totalPages: number;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    path?: string;
  };
}

export interface ApiValidationError {
  field?: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  code: number;
  errorCode?: string;
  message: string;
  errors?: ApiValidationError[];
  meta?: {
    timestamp: string;
    requestId?: string;
    path?: string;
  };
}
