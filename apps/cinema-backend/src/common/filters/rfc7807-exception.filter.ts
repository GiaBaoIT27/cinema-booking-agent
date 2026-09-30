import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  ErrorResponseDto,
  ValidationErrorDetail,
} from '../dto/base-response.dto.js';

@Catch()
export class Rfc7807ExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(Rfc7807ExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'Đã có lỗi hệ thống xảy ra';
    let errors: ValidationErrorDetail[] = [];

    // Lấy requestId đã được RequestContextMiddleware gắn sẵn vào request
    const requestId =
      (request.headers['x-request-id'] as string) ||
      (request as any).requestId;

    // 1. Xử lý các lỗi HTTP được ném ra từ NestJS (HttpException & subclass)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse: any = exception.getResponse();

      if (status === HttpStatus.UNPROCESSABLE_ENTITY) {
        // Lỗi Validation từ pipe — đã được main.ts định dạng sẵn
        errorCode = 'INVALID_INPUT';
        message = 'Dữ liệu đầu vào không hợp lệ';
        errors = exceptionResponse.message || [];
      } else {
        // Ưu tiên lấy errorCode nghiệp vụ (do BusinessException hoặc Service truyền ra)
        errorCode =
          typeof exceptionResponse === 'object' && exceptionResponse.errorCode
            ? exceptionResponse.errorCode
            : 'HTTP_EXCEPTION';

        // Bóc tách message an toàn
        const rawMessage =
          typeof exceptionResponse === 'object'
            ? exceptionResponse.message
            : exceptionResponse;

        message = Array.isArray(rawMessage)
          ? rawMessage.join(', ')
          : String(rawMessage);
      }
    }
    // 2a. Lỗi unique constraint (PostgreSQL 23505)
    else if (exception && exception.code === '23505') {
      status = HttpStatus.CONFLICT;
      errorCode = 'DATA_ALREADY_EXISTS';
      message = 'Dữ liệu bị trùng lặp trong hệ thống';

      const detail: string = exception.detail || '';
      const match = detail.match(/\((.*?)\)=\((.*?)\)/);
      if (match && match[1] && match[2]) {
        errors.push({
          field: match[1],
          message: `Giá trị '${match[2]}' đã tồn tại và không thể sử dụng lại.`,
        });
      }
    }
    // 2b. Lỗi foreign key violation (PostgreSQL 23503) — tách riêng, không lẫn vào 23505
    else if (exception && exception.code === '23503') {
      status = HttpStatus.BAD_REQUEST;
      errorCode = 'FOREIGN_KEY_VIOLATION';
      message = 'Dữ liệu liên kết không tồn tại hoặc đang được sử dụng';

      const detail: string = exception.detail || '';
      const match = detail.match(/Key \((.*?)\)=\((.*?)\)/);
      if (match && match[1] && match[2]) {
        errors.push({
          field: match[1],
          message: `Tham chiếu '${match[2]}' không tồn tại trong hệ thống.`,
        });
      }
    }
    // 3. Các lỗi không xác định khác (runtime crash, lỗi kết nối DB...)
    else {
      const errorMsg =
        exception instanceof Error ? exception.message : String(exception);
      const errorStack = exception instanceof Error ? exception.stack : '';

      // Không lộ thông tin nội bộ ra client
      message = 'Đã có lỗi hệ thống xảy ra';

      this.logger.error(
        `[${requestId}] Unhandled Exception: ${errorMsg}`,
        errorStack,
      );
    }

    // Đóng gói Response Error chuẩn hóa RFC 7807-inspired
    const errorResponse: ErrorResponseDto = {
      success: false,
      code: status,
      errorCode,
      message,
      errors: errors.length > 0 ? errors : undefined,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        path: request.url,
      },
    };

    response.status(status).json(errorResponse);
  }
}
