import { Inject, Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, UnrecoverableError } from 'bullmq';
import { QueueNames } from '#src/common/constants/queue-names.constant.js';
import {
  NOTIFICATION_CHANNELS,
  type INotificationChannel,
  type NotificationChannelType,
  type NotificationJobData,
} from './notification.types.js';

/**
 * Worker gửi thông báo thật. Retry/backoff cấu hình ở defaultJobOptions trong NotificationsModule.
 * Ném lỗi thường => BullMQ retry; ném UnrecoverableError => bỏ ngay, không retry.
 */
@Processor(QueueNames.NOTIFICATION, { concurrency: 5 })
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);
  private readonly channelMap: Map<
    NotificationChannelType,
    INotificationChannel
  >;

  constructor(@Inject(NOTIFICATION_CHANNELS) channels: INotificationChannel[]) {
    super();
    this.channelMap = new Map(
      channels.map((channel) => [channel.type, channel]),
    );
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    const { type, channel, recipient, content } = job.data;

    const handler = this.channelMap.get(channel);
    if (!handler) {
      throw new UnrecoverableError(`Unknown notification channel: ${channel}`);
    }

    await handler.send(recipient, content);
    this.logger.debug(`Sent ${type} via ${channel} (job ${job.id})`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<NotificationJobData> | undefined, error: Error): void {
    if (!job) return;

    const maxAttempts = job.opts.attempts ?? 1;
    const message = `${job.data.type} via ${job.data.channel} failed (job ${job.id}, attempt ${job.attemptsMade}/${maxAttempts}): ${error.message}`;

    if (job.attemptsMade >= maxAttempts) {
      this.logger.error(`${message} - GIVING UP`);
    } else {
      this.logger.warn(message);
    }
  }
}
