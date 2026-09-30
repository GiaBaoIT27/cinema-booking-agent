import { Module } from '@nestjs/common';
import { DomainEventBusModule } from './event-bus/domain-event-bus.module.js';
import { LoggerModule } from './logger/logger.module.js';
import { MailerModule } from './mailer/mailer.module.js';
import { QueueModule } from './queue/queue.module.js';
import { RedisModule } from './redis/redis.module.js';
import { StorageModule } from './storage/storage.module.js';

@Module({
  imports: [
    DomainEventBusModule,
    LoggerModule,
    RedisModule,
    QueueModule,
    MailerModule,
    StorageModule,
  ],
})
export class CoreModule {}
