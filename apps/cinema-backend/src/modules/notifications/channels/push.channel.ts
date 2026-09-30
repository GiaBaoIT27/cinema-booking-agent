import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationChannelType,
  type INotificationChannel,
  type NotificationContent,
  type NotificationRecipient,
} from '../notification.types.js';

/**
 * STUB: mới chỉ ghi log. Push gửi theo userId (không cần email/SĐT), nên phù hợp
 * cho event chỉ mang userId như booking.expired. Khi làm thật cần một nơi lưu
 * device token (FCM) theo userId. Mặc định TẮT (NOTIFICATION_PUSH_ENABLED).
 */
@Injectable()
export class PushChannel implements INotificationChannel {
  readonly type = NotificationChannelType.PUSH;
  private readonly logger = new Logger(PushChannel.name);

  constructor(private readonly config: ConfigService) {}

  isEnabled(): boolean {
    return this.config.get<boolean>('notification.pushEnabled', false);
  }

  canSend(recipient: NotificationRecipient): boolean {
    return Boolean(recipient.userId);
  }

  async send(recipient: NotificationRecipient, content: NotificationContent): Promise<void> {
    // TODO: tra device token theo recipient.userId rồi gọi FCM.
    this.logger.log(`[Push stub] to user ${recipient.userId}: ${content.shortText}`);
  }
}
