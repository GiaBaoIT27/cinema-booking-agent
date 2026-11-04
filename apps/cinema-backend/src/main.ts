import {
  ValidationPipe,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { Rfc7807ExceptionFilter } from './common/filters/rfc7807-exception.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';

/** CORS_ORIGINS="https://a.com,https://b.com". Trống => cho phép mọi origin (CHỈ dev; production bị env.validation chặn). */
function corsOrigins(): string[] | true {
  const list = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return list.length > 0 ? list : true;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Đứng sau reverse proxy (nginx, load balancer): tin X-Forwarded-For để lấy IP thật
  // của client – rate limit theo IP phụ thuộc vào đây. Số = số proxy phía trước.
  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy) {
    app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);
  }

  // Header bảo mật mặc định (HSTS, nosniff, frameguard...). API chỉ trả JSON nên CSP
  // của helmet không ảnh hưởng; Swagger UI (nếu bật) cần nới CSP riêng.
  app.use(helmet());
  app.enableCors({
    origin: corsOrigins(),
    credentials: true,
  });
  app.setGlobalPrefix('api/v1');

  // Tự động validate dữ liệu DTO đầu vào
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Loại bỏ các trường thừa không định nghĩa trong DTO
      transform: true, // Tự động ép kiểu dữ liệu từ request sang DTO
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      exceptionFactory: (errors) => {
        // Biến đổi danh sách lỗi Class-Validator thành mảng cấu trúc phẳng
        const validationErrors = errors.flatMap((error) => {
          const constraints = error.constraints ?? {};
          return Object.values(constraints).map((message) => ({
            field: error.property,
            message: message,
          }));
        });

        // Ném mảng cấu trúc trực tiếp vào Exception
        return new UnprocessableEntityException(validationErrors);
      },
    }),
  );
  // Sử dụng interceptor để định dạng response
  app.useGlobalInterceptors(new TransformInterceptor(new Reflector()));
  // Sử dụng exception filter để định dạng lỗi
  app.useGlobalFilters(new Rfc7807ExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
