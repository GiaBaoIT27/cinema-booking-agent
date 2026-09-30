import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventNames } from '#src/common/constants/event-names.constant.js';
import type { UserRegisteredEventPayload } from '#src/common/events/index.js';
import { NotificationsService } from '../notifications.service.js';

@Injectable()
export class OnUserRegisteredListener {
  private readonly logger = new Logger(OnUserRegisteredListener.name);

  constructor(private readonly notifications: NotificationsService) {}

  @OnEvent(EventNames.USER_REGISTERED, { async: true })
  async handle(payload: UserRegisteredEventPayload): Promise<void> {
    try {
      await this.notifications.sendWelcome(payload);
    } catch (error) {
      this.logger.error(
        `Failed to handle ${EventNames.USER_REGISTERED} (user ${payload.userId})`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
