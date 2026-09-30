import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueNames } from '#src/common/constants/queue-names.constant.js';
import { MailerModule } from '#src/core/mailer/mailer.module.js';
import { EmailChannel } from './channels/email.channel.js';
import { PushChannel } from './channels/push.channel.js';
import { SmsChannel } from './channels/sms.channel.js';
import { OnBookingExpiredListener } from './listeners/on-booking-expired.listener.js';
import { OnOrderPaidListener } from './listeners/on-order-paid.listener.js';
import { OnUserRegisteredListener } from './listeners/on-user-registered.listener.js';
import { NOTIFICATION_CHANNELS } from './notification.types.js';
import { NotificationsProcessor } from './notifications.processor.js';
import { NotificationsService } from './notifications.service.js';

/**
 * Module lá: chỉ NGHE event, không ai được gọi vào => cố ý KHÔNG có `exports`
 * và không có `public-api/`. Muốn thêm kênh mới: viết 1 class implement
 * INotificationChannel, đăng ký vào providers + mảng NOTIFICATION_CHANNELS.
 */
@Module({
  imports: [
    MailerModule,
    BullModule.registerQueue({
      name: QueueNames.NOTIFICATION,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: { age: 24 * 3600, count: 1000 },
        removeOnFail: { age: 7 * 24 * 3600 },
      },
    }),
  ],
  providers: [
    NotificationsService,
    NotificationsProcessor,
    OnOrderPaidListener,
    OnUserRegisteredListener,
    OnBookingExpiredListener,
    EmailChannel,
    SmsChannel,
    PushChannel,
    {
      provide: NOTIFICATION_CHANNELS,
      useFactory: (email: EmailChannel, sms: SmsChannel, push: PushChannel) => [
        email,
        sms,
        push,
      ],
      inject: [EmailChannel, SmsChannel, PushChannel],
    },
  ],
})
export class NotificationsModule {}
