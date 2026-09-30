import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventNames } from '#src/common/constants/event-names.constant.js';
import type { OrderPaidEventPayload } from '#src/common/events/index.js';
import { NotificationsService } from '../notifications.service.js';

@Injectable()
export class OnOrderPaidListener {
  private readonly logger = new Logger(OnOrderPaidListener.name);

  constructor(private readonly notifications: NotificationsService) {}

  // async: true => không chặn luồng thanh toán của module phát event
  @OnEvent(EventNames.ORDER_PAID, { async: true })
  async handle(payload: OrderPaidEventPayload): Promise<void> {
    try {
      await this.notifications.sendTicketConfirmation(payload);
    } catch (error) {
      this.logger.error(
        `Failed to handle ${EventNames.ORDER_PAID} (order ${payload.orderId})`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
