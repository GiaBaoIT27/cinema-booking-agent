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

    // Tạo hoặc kế thừa Tracing ID giúp trace log giữa các service
    const requestId =
      (request.headers['x-request-id'] as string) ||
      `req-${Math.random().toString(36).substring(2, 15)}`;

    // 1. Xử lý các lỗi HTTP được ném ra từ NestJS ứng dụng
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse: any = exception.getResponse();

      if (status === HttpStatus.UNPROCESSABLE_ENTITY) {
        // Lỗi Validation từ pipe đã được ta định dạng sẵn ở main.ts
        errorCode = 'INVALID_INPUT';
        message = 'Dữ liệu đầu vào không hợp lệ';
        errors = exceptionResponse.message || [];
      } else {
        // Ưu tiên lấy errorCode nghiệp vụ từ Service truyền ra, nếu không có mới dùng fallback
        errorCode =
          typeof exceptionResponse === 'object' && exceptionResponse.errorCode
            ? exceptionResponse.errorCode
            : 'HTTP_EXCEPTION';

        // Bóc tách message an toàn (tránh trường hợp exceptionResponse là object hay chuỗi thô)
        const rawMessage =
          typeof exceptionResponse === 'object'
            ? exceptionResponse.message
            : exceptionResponse;

        message = Array.isArray(rawMessage)
          ? rawMessage.join(', ')
          : String(rawMessage);
      }
    }
    // 2. Xử lý lỗi từ Tầng Cơ sở dữ liệu (PostgreSQL / TypeORM)
    else if (
      exception &&
      (exception.code === '23505' || exception.code === '23503')
    ) {
      if (exception.code === '23505') {
        status = HttpStatus.CONFLICT;
        errorCode = 'DATA_ALREADY_EXISTS';
        message = 'Dữ liệu bị trùng lặp trong hệ thống';

        const detail = exception.detail || '';
        const match = detail.match(/\((.*?)\)=\((.*?)\)/);
        if (match && match[1] && match[2]) {
          errors.push({
            field: match[1],
            message: `Giá trị '${match[2]}' đã tồn tại và không thể sử dụng lại.`,
          });
        } else {
          status = HttpStatus.BAD_REQUEST;
          errorCode = 'FOREIGN_KEY_VIOLATION';
          message = 'Dữ liệu liên kết không tồn tại hoặc đang được sử dụng';
        }
      }
    }
    // 3. Các lỗi không xác định khác (Lỗi runtime, crash code...)
    else {
      const errorMsg =
        exception instanceof Error ? exception.message : String(exception);
      const errorStack = exception instanceof Error ? exception.stack : '';

      message = 'Đã có lỗi hệ thống xảy ra'; // Giữ thông điệp chung chung bảo mật cho client

      this.logger.error(
        `[${requestId}] Unhandled Exception: ${errorMsg}`,
        errorStack,
      );
    }

    // Đóng gói Response Error chuẩn hóa
    const errorResponse: ErrorResponseDto = {
      success: false,
      statusCode: status,
      errorCode: errorCode,
      message: Array.isArray(message) ? message.join(', ') : message,
      errors: errors.length > 0 ? errors : undefined,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: requestId,
        path: request.url,
      },
    };

    response.status(status).json(errorResponse);
  }
}
