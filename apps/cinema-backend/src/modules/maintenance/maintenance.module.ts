import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { QueueNames } from '#src/common/constants/queue-names.constant.js';
import { BookingsModule } from '#modules/bookings/bookings.module.js';
import { OrdersModule } from '#modules/orders/orders.module.js';
import { PaymentsModule } from '#modules/payments/payments.module.js';

import { MaintenanceProcessor } from './maintenance.processor.js';
import { MaintenanceScheduler } from './maintenance.scheduler.js';

/**
 * Module lá điều phối các việc bảo trì định kỳ của trục Sales. Chỉ gọi facade của
 * bookings/orders/payments – không chứa nghiệp vụ, không ai gọi vào nên không `exports`.
 */
@Module({
  imports: [
    BullModule.registerQueue({
      name: QueueNames.MAINTENANCE,
      defaultJobOptions: {
        removeOnComplete: { count: 100 },
        removeOnFail: { age: 24 * 3600 },
      },
    }),
    BookingsModule,
    OrdersModule,
    PaymentsModule,
  ],
  providers: [MaintenanceScheduler, MaintenanceProcessor],
})
export class MaintenanceModule {}
