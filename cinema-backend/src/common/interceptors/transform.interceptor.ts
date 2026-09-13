import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';
import { ApiResponseDto } from '../dto/base-response.dto.js';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponseDto<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponseDto<T>> {
    // 1. Bỏ qua nếu không phải là HTTP request (ví dụ: gRPC, GraphQL, WebSockets)
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 2. Đồng bộ Request ID: Ưu tiên lấy ID đã có sẵn trong request object (do Middleware hoặc Filter tạo trước đó)
    const requestId =
      (request.headers['x-request-id'] as string) ||
      (request as any).requestId ||
      `req-${Math.random().toString(36).substring(2, 15)}`;

    (request as any).requestId = requestId;

    return next.handle().pipe(
      map((data) => {
        // 3. Xử lý an toàn: Nếu Controller trả về một Stream tải file (StreamableFile), giữ nguyên không bọc JSON
        if (
          data &&
          data.constructor &&
          data.constructor.name === 'StreamableFile'
        ) {
          return data;
        }
        let responseData = data !== undefined ? data : null;
        let paginationMeta = undefined;

        // Nếu dữ liệu trả về từ Service/Controller có cấu trúc phân trang dạng { items: [], pagination: {} }
        if (
          data &&
          typeof data === 'object' &&
          'items' in data &&
          'pagination' in data
        ) {
          responseData = data.items; // Đưa mảng danh sách vào trường data chính
          paginationMeta = data.pagination; // Tách cục phân trang ra ngoài
        }

        return {
          success: true,
          statusCode: response.statusCode,
          message:
            (request as any).customMessage || 'Thao tác thực hiện thành công',
          data: data !== undefined ? data : null,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: requestId,
            path: request.url,
            ...paginationMeta, // Nếu có phân trang, các thông số page, limit... sẽ tự động gộp thẳng vào meta chung
          },
        };
      }),
    );
  }
}
