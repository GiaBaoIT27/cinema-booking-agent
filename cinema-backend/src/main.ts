import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.setGlobalPrefix('api/v1');

  // Tự động validate dữ liệu DTO đầu vào
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Tự lọc bỏ các field không khai báo trong DTO
      transform: true, // Tự ép kiểu dữ liệu (vd: string sang number)
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
