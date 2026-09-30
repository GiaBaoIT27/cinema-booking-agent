import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationChannelType,
  type INotificationChannel,
  type NotificationContent,
  type NotificationRecipient,
} from '../notification.types.js';

/** Che SĐT khi ghi log (PII): 0901234567 -> 090***4567 */
function maskPhone(phone: string): string {
  return phone.length <= 6 ? '***' : `${phone.slice(0, 3)}***${phone.slice(-4)}`;
}

/**
 * STUB: mới chỉ ghi log. Muốn gửi thật, thay thân hàm send() bằng lời gọi tới
 * nhà cung cấp SMS (eSMS, SpeedSMS, Twilio...). Mặc định TẮT (NOTIFICATION_SMS_ENABLED).
 */
@Injectable()
export class SmsChannel implements INotificationChannel {
  readonly type = NotificationChannelType.SMS;
  private readonly logger = new Logger(SmsChannel.name);

  constructor(private readonly config: ConfigService) {}

  isEnabled(): boolean {
    return this.config.get<boolean>('notification.smsEnabled', false);
  }

  canSend(recipient: NotificationRecipient): boolean {
    return Boolean(recipient.phone);
  }

  async send(recipient: NotificationRecipient, content: NotificationContent): Promise<void> {
    if (!recipient.phone) {
      throw new Error('Recipient has no phone number');
    }
    // TODO: gọi API nhà cung cấp SMS tại đây.
    this.logger.log(`[SMS stub] to ${maskPhone(recipient.phone)}: ${content.shortText}`);
  }
}
