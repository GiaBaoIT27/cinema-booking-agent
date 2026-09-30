import { Injectable } from '@nestjs/common';
import QRCode from 'qrcode';
import { MailerService } from '#src/core/mailer/mailer.service.js';
import {
  NotificationChannelType,
  type INotificationChannel,
  type NotificationContent,
  type NotificationRecipient,
} from '../notification.types.js';

@Injectable()
export class EmailChannel implements INotificationChannel {
  readonly type = NotificationChannelType.EMAIL;

  constructor(private readonly mailer: MailerService) {}

  isEnabled(): boolean {
    return true;
  }

  canSend(recipient: NotificationRecipient): boolean {
    return Boolean(recipient.email);
  }

  async send(
    recipient: NotificationRecipient,
    content: NotificationContent,
  ): Promise<void> {
    if (!recipient.email) {
      throw new Error('Recipient has no email address');
    }

    // Render QR thành PNG rồi nhúng inline bằng cid. Không dùng data-URI vì Gmail chặn.
    const attachments = await Promise.all(
      (content.inlineQrCodes ?? []).map(async (qr) => ({
        filename: `${qr.cid}.png`,
        content: await QRCode.toBuffer(qr.data, { width: 320, margin: 1 }),
        cid: qr.cid,
        contentType: 'image/png',
      })),
    );

    await this.mailer.send({
      to: recipient.email,
      subject: content.subject,
      text: content.text,
      html: content.html,
      attachments,
    });
  }
}
