import { BaseDomainEvent } from '#src/common/domain/domain-event.base.js';
import { EventNames } from '#src/common/constants/event-names.constant.js';

/**
 * Domain event bắn ra khi ma trận quyền của một Role thay đổi.
 * Listener: `OnRolePermissionsChangedHandler` → xóa Redis cache phân quyền
 * của tất cả user đang giữ role này.
 */
export class RolePermissionsChangedEvent extends BaseDomainEvent {
  public readonly aggregateId: string;

  constructor(
    /** ID của Role bị thay đổi quyền */
    public readonly roleId: string,
    /** Code của Role (để log) */
    public readonly roleCode: string,
    /** Action thực hiện */
    public readonly action: 'sync' | 'append' | 'revoke',
  ) {
    super();
    this.aggregateId = roleId;
  }

  getEventName(): string {
    return EventNames.RBAC_ROLE_PERMISSIONS_CHANGED;
  }
}
