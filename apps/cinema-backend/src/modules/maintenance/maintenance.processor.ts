import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { QueueNames } from '#src/common/constants/queue-names.constant.js';
import { BookingsFacade } from '#modules/bookings/public-api/index.js';
import { OrdersFacade } from '#modules/orders/public-api/orders.facade.js';
import { PaymentsFacade } from '#modules/payments/public-api/payments.facade.js';

export interface MaintenanceRunResult {
  expiredOrders: number;
  releasedHolds: number;
  settledPayments: number;
  refundedPayments: number;
  errors: string[];
}

/**
 * Một lượt bảo trì. THỨ TỰ quan trọng:
 *  1. Đối soát thanh toán trước – đơn đã được trả tiền thì phải xuất vé trước khi bị hủy.
 *  2. Hủy đơn PENDING quá hạn (nhả ghế đã gắn đơn).
 *  3. Nhả các lượt giữ ghế hết hạn chưa gắn đơn.
 * Mỗi bước độc lập: bước trước lỗi không chặn bước sau.
 */
@Processor(QueueNames.MAINTENANCE, { concurrency: 1 })
export class MaintenanceProcessor extends WorkerHost {
  private readonly logger = new Logger(MaintenanceProcessor.name);

  constructor(
    private readonly paymentsFacade: PaymentsFacade,
    private readonly ordersFacade: OrdersFacade,
    private readonly bookingsFacade: BookingsFacade,
  ) {
    super();
  }

  async process(_job: Job): Promise<MaintenanceRunResult> {
    return this.runOnce();
  }

  async runOnce(): Promise<MaintenanceRunResult> {
    const result: MaintenanceRunResult = {
      expiredOrders: 0,
      releasedHolds: 0,
      settledPayments: 0,
      refundedPayments: 0,
      errors: [],
    };

    const step = async (name: string, work: () => Promise<void>) => {
      try {
        await work();
      } catch (error) {
        result.errors.push(`${name}: ${String(error)}`);
        this.logger.error(`[Maintenance] Bước "${name}" lỗi: ${String(error)}`);
      }
    };

    await step('reconcile-payments', async () => {
      const { settled, refunded } =
        await this.paymentsFacade.reconcilePayments();
      result.settledPayments = settled;
      result.refundedPayments = refunded;
    });
    await step('expire-orders', async () => {
      result.expiredOrders = await this.ordersFacade.cleanupExpiredOrders();
    });
    await step('release-holds', async () => {
      result.releasedHolds = await this.bookingsFacade.cleanupExpiredHolds();
    });

    return result;
  }
}
