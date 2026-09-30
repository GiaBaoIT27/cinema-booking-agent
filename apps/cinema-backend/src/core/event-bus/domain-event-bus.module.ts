import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

/**
 * Domain Event Bus — dùng EventEmitter2 (qua @nestjs/event-emitter) làm nền.
 * Global module: mọi module nghiệp vụ chỉ cần `import { EventEmitter2 } from
 * '@nestjs/event-emitter'` để emit/listen, KHÔNG import lại module này.
 *
 * Chỉ khai báo 1 LẦN DUY NHẤT trong CoreModule.
 */
@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      // Không dùng wildcard listener ('booking.*') để tránh 1 handler vô tình
      // bắt nhầm event không liên quan — mỗi listener khai báo đúng tên event.
      wildcard: false,
      delimiter: '.',
      maxListeners: 20,
      // Cảnh báo sớm nếu 1 event có > 20 listener — dấu hiệu thiết kế sai
      // (thường là quên gỡ listener cũ hoặc đăng ký trùng).
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
  ],
  exports: [EventEmitterModule],
})
export class DomainEventBusModule {}
