import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TokenRevocationService } from '../services/token-revocation.service.js';
import { EventNames } from '#src/common/constants/event-names.constant.js';
import type { UserBlockedEvent } from '#modules/users/domain/events/user-blocked.event.js';

@Injectable()
export class OnUserBlockedHandler {
  constructor(
    private readonly tokenRevocationService: TokenRevocationService,
  ) {}

  @OnEvent(EventNames.USER_BLOCKED)
  async handle(event: UserBlockedEvent) {
    // Thu hồi TẤT CẢ Token hiện có của User
    await this.tokenRevocationService.revokeAllUserTokens(event.userId);
  }
}
