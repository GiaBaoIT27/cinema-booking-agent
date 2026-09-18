export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export interface ResponseMeta {
  timestamp: string;
  requestId: string;
  path: string;
}

// DTO cho phản hồi thành công
export class ApiResponseDto<T = any> {
  success: boolean = true;
  code: number;
  message: string;
  data?: T;
  meta: ResponseMeta;
}

// DTO cho phản hồi lỗi
export class ErrorResponseDto {
  success: boolean = false;
  statusCode: number;
  errorCode: string;
  message: string;
  errors?: ValidationErrorDetail[];
  meta: ResponseMeta;
}
