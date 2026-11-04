import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { QueueNames } from '#src/common/constants/queue-names.constant.js';

export const MAINTENANCE_JOB = 'sales-maintenance';

/** Chu kỳ chạy (ms). Ngắn hơn nhiều so với khoảng đệm giữ ghế (5 phút) sau hạn đơn. */
const MAINTENANCE_INTERVAL_MS = Number(
  process.env.MAINTENANCE_INTERVAL_MS ?? 60_000,
);

/**
 * Đăng ký job lặp trên BullMQ. `upsertJobScheduler` idempotent theo id nên chạy nhiều
 * instance backend vẫn chỉ có MỘT lịch, và mỗi lượt chỉ một worker nhận job.
 */
@Injectable()
export class MaintenanceScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(MaintenanceScheduler.name);

  constructor(
    @InjectQueue(QueueNames.MAINTENANCE) private readonly queue: Queue,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.MAINTENANCE_DISABLED === 'true') {
      this.logger.warn('Job bảo trì định kỳ đang TẮT (MAINTENANCE_DISABLED=true)');
      return;
    }
    await this.queue.upsertJobScheduler(
      MAINTENANCE_JOB,
      { every: MAINTENANCE_INTERVAL_MS },
      { name: MAINTENANCE_JOB },
    );
    this.logger.log(
      `Đã lên lịch job bảo trì mỗi ${MAINTENANCE_INTERVAL_MS / 1000}s`,
    );
  }
}
