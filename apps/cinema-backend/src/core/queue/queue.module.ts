import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

/**
 * Đăng ký connection Redis DÙNG RIÊNG cho BullMQ (tách khỏi REDIS_CLIENT của
 * RedisModule, dù trỏ cùng 1 Redis server). BullMQ tự quản lý connection theo
 * cách riêng (blocking commands cho job polling) — không nên tái dùng chung
 * 1 instance ioredis với phần cache/lock, tránh 1 lệnh blocking của BullMQ
 * làm nghẽn các lệnh get/set khác.
 *
 * Global + forRootAsync ở đây: mọi module nghiệp vụ chỉ cần
 *   BullModule.registerQueue({ name: QUEUE_NAMES.NOTIFICATION, defaultJobOptions: {...} })
 * KHÔNG cần khai báo lại connection.
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host', 'localhost'),
          port: config.get<number>('redis.port', 6379),
          password: config.get<string>('redis.password'),
          // BullMQ BẮT BUỘC null ở đây (khác RedisModule) vì worker cần lệnh
          // blocking (BRPOPLPUSH...) chờ vô hạn thay vì tự bỏ sau N lần retry.
          maxRetriesPerRequest: null,
        },
      }),
    }),
  ],
  // Export lại BullModule: các module nghiệp vụ gọi BullModule.registerQueue()
  // ở nơi khác trong app mới "thấy" được config connection khai báo ở forRootAsync() này.
  exports: [BullModule],
})
export class QueueModule {}
