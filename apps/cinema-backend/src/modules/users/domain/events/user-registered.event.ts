import { BaseDomainEvent } from '#src/common/domain/domain-event.base.js';
import { EventNames } from '#src/common/constants/event-names.constant.js';

/**
 * Domain Event phát ra khi một tài khoản người dùng mới được khởi tạo thành công.
 * Listeners:
 *  - notifications module: gửi email xác thực / chào mừng
 *  - auth module: khởi tạo session/token nếu cần
 */
export class UserRegisteredEvent extends BaseDomainEvent {
  public readonly aggregateId: string;

  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly fullName: string,
    public readonly phoneNumber: string,
  ) {
    super();
    this.aggregateId = userId;
  }

  getEventName(): string {
    return EventNames.USER_REGISTERED;
  }
}
