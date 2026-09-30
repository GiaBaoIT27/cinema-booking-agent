import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueNames } from '#src/common/constants/queue-names.constant.js';
import type {
  BookingExpiredEventPayload,
  OrderPaidEventPayload,
  UserRegisteredEventPayload,
} from '#src/common/events/index.js';
import {
  NOTIFICATION_CHANNELS,
  NotificationChannelType,
  NotificationType,
  type INotificationChannel,
  type NotificationContent,
  type NotificationJobData,
  type NotificationRecipient,
} from './notification.types.js';
import { renderBookingExpired } from './templates/booking-expired.template.js';
import { renderTicketConfirmation } from './templates/ticket-confirmation.template.js';
import type { TemplateContext } from './templates/template.util.js';
import { renderWelcome } from './templates/welcome.template.js';

interface DispatchParams {
  type: NotificationType;
  /** Id nghiệp vụ gây ra thông báo (orderId, userId...). Dùng để chống gửi trùng. */
  referenceId: string;
  recipient: NotificationRecipient;
  content: NotificationContent;
  channels: NotificationChannelType[];
}

/**
 * Điều phối thông báo: chọn template -> lọc kênh dùng được -> đưa vào hàng đợi.
 * KHÔNG gửi trực tiếp: gửi thật do NotificationsProcessor làm, có retry + backoff.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly channelMap: Map<
    NotificationChannelType,
    INotificationChannel
  >;
  private readonly templateContext: TemplateContext;

  constructor(
    @InjectQueue(QueueNames.NOTIFICATION)
    private readonly queue: Queue<NotificationJobData>,
    @Inject(NOTIFICATION_CHANNELS) channels: INotificationChannel[],
    config: ConfigService,
  ) {
    this.channelMap = new Map(
      channels.map((channel) => [channel.type, channel]),
    );
    this.templateContext = {
      brandName: config.get<string>('notification.brandName', 'Cinema'),
      webBaseUrl: config.get<string>(
        'notification.webBaseUrl',
        'http://localhost:3001',
      ),
    };
  }

  async sendTicketConfirmation(payload: OrderPaidEventPayload): Promise<void> {
    await this.dispatch({
      type: NotificationType.TICKET_CONFIRMATION,
      referenceId: payload.orderId,
      recipient: {
        userId: payload.userId,
        name: payload.customerName,
        email: payload.customerEmail,
        phone: payload.customerPhone,
      },
      content: renderTicketConfirmation(payload, this.templateContext),
      channels: [NotificationChannelType.EMAIL, NotificationChannelType.SMS],
    });
  }

  async sendWelcome(payload: UserRegisteredEventPayload): Promise<void> {
    await this.dispatch({
      type: NotificationType.WELCOME,
      referenceId: payload.userId,
      recipient: {
        userId: payload.userId,
        name: payload.fullName,
        email: payload.email,
        phone: payload.phone,
      },
      content: renderWelcome(payload, this.templateContext),
      channels: [NotificationChannelType.EMAIL],
    });
  }

  async sendBookingExpired(payload: BookingExpiredEventPayload): Promise<void> {
    await this.dispatch({
      type: NotificationType.BOOKING_EXPIRED,
      referenceId: payload.bookingId,
      recipient: { userId: payload.userId },
      content: renderBookingExpired(payload, this.templateContext),
      channels: [NotificationChannelType.PUSH],
    });
  }

  private async dispatch(params: DispatchParams): Promise<void> {
    const { type, referenceId, recipient, content, channels } = params;

    const usable = channels.filter((channelType) => {
      const channel = this.channelMap.get(channelType);
      return (
        channel !== undefined &&
        channel.isEnabled() &&
        channel.canSend(recipient)
      );
    });

    if (usable.length === 0) {
      this.logger.warn(
        `No usable channel for ${type} (ref: ${referenceId}), skipped`,
      );
      return;
    }

    // jobId cố định theo (loại, đối tượng, kênh): event bị phát lặp (VD: IPN gọi lại)
    // thì BullMQ bỏ qua job trùng, khách không nhận 2 mail. Không dùng ':' trong jobId.
    const results = await Promise.allSettled(
      usable.map((channel) =>
        this.queue.add(
          type,
          { type, channel, recipient, content },
          { jobId: `${type}-${referenceId}-${channel}` },
        ),
      ),
    );

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const reason: unknown = result.reason;
        this.logger.error(
          `Failed to enqueue ${type} via ${usable[index]} (ref: ${referenceId})`,
          reason instanceof Error ? reason.stack : String(reason),
        );
      }
    });
  }
}
