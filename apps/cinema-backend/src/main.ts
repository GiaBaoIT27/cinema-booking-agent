import {
  ValidationPipe,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { Rfc7807ExceptionFilter } from './common/filters/rfc7807-exception.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
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
