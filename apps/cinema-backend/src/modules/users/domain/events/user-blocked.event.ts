import { BaseDomainEvent } from '#src/common/domain/domain-event.base.js';
import { EventNames } from '#src/common/constants/event-names.constant.js';

/**
 * Domain Event phát ra khi tài khoản người dùng bị khóa (status = BLOCKED).
 * Listeners:
 *  - auth module: lắng nghe để thu hồi ngay lập tức toàn bộ phiên đăng nhập (JWT token / Refresh token) trong Redis.
 */
export class UserBlockedEvent extends BaseDomainEvent {
  public readonly aggregateId: string;

  constructor(
    public readonly userId: string,
    public readonly reason?: string,
  ) {
    super();
    this.aggregateId = userId;
  }

  getEventName(): string {
    return EventNames.USER_BLOCKED;
  }
}
