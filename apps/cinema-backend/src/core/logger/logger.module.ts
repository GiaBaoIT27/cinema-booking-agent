import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { buildWinstonOptions } from './winston.config.js';

/**
 * Thay Logger mặc định của Nest bằng Winston. Dùng cách này thay vì tự viết
 * LoggerService từ đầu, vì nest-winston đã xử lý sẵn tương thích với
 * `new Logger(ClassName.name)` mà code cũ (VD: RedisService, MailerService)
 * đang dùng — KHÔNG cần sửa lại bất kỳ chỗ nào đã gọi Logger trước đó.
 *
 * Đấu nối trong main.ts:
 *   const app = await NestFactory.create(AppModule, { bufferLogs: true });
 *   app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
 */
@Global()
@Module({
  imports: [
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => buildWinstonOptions(config.get<string>('app.nodeEnv', 'development')),
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}
