import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';
import { ApiResponseDto } from '../dto/base-response.dto.js';
import { API_SUCCESS_MESSAGE_KEY } from '../decorators/api-message.decorator.js';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponseDto<T>
> {
  // Reflector giúp đọc metadata từ decorator (ví dụ: @ApiSuccessMessage)
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponseDto<T>> {
    // 1. Bỏ qua nếu không phải là HTTP request (ví dụ: gRPC, GraphQL, WebSockets)
    if (context.getType() !== 'http') return next.handle();

    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const handler = context.getHandler();

    // 2. Đồng bộ Request ID: Ưu tiên lấy ID đã có sẵn trong request object (do Middleware hoặc Filter tạo trước đó)
    const requestId = request.headers['x-request-id'] as string;

    // 3. Ưu tiên message tùy chỉnh khai báo bằng decorator @ApiSuccessMessage(),
    //    sau đó đến request.customMessage, cuối cùng là message mặc định.
    const decoratorMessage = this.reflector.get<string>(
      API_SUCCESS_MESSAGE_KEY,
      handler,
    );

    return next.handle().pipe(
      map((data) => {
        // 4. Xử lý an toàn: Nếu Controller trả về một Stream tải file (StreamableFile), giữ nguyên không bọc JSON
        if (
          data &&
          data.constructor &&
          data.constructor.name === 'StreamableFile'
        )
          return data;

        let responseData = data !== undefined ? data : null;
        let pagination = undefined;

        // Nếu dữ liệu trả về từ Service/Controller có cấu trúc phân trang dạng { items: [], pagination: {} }
        if (data && typeof data === 'object' && 'pagination' in data) {
          // Chấp nhận cả việc Controller trả về 'items' hoặc 'data'
          responseData =
            'items' in data ? (data as any).items : (data as any).data;
          pagination = (data as any).pagination;
        }

        return {
          success: true,
          code: response.statusCode,
          message:
            decoratorMessage ||
            (request as any).customMessage ||
            'Thao tác thực hiện thành công',
          data: responseData,
          pagination,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: requestId,
            path: request.url,
          },
        };
      }),
    );
  }
}
