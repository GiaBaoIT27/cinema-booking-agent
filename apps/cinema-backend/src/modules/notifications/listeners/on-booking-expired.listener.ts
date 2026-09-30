import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventNames } from '#src/common/constants/event-names.constant.js';
import type { BookingExpiredEventPayload } from '#src/common/events/index.js';
import { NotificationsService } from '../notifications.service.js';

@Injectable()
export class OnBookingExpiredListener {
  private readonly logger = new Logger(OnBookingExpiredListener.name);

  constructor(private readonly notifications: NotificationsService) {}

  @OnEvent(EventNames.BOOKING_EXPIRED, { async: true })
  async handle(payload: BookingExpiredEventPayload): Promise<void> {
    try {
      await this.notifications.sendBookingExpired(payload);
    } catch (error) {
      this.logger.error(
        `Failed to handle ${EventNames.BOOKING_EXPIRED} (booking ${payload.bookingId})`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
