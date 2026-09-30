import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RolePermissionsChangedEvent } from '../../domain/events/role-permissions-changed.event.js';
import { PermissionCacheService } from '../services/permission-cache.service.js';
import { EventNames } from '#src/common/constants/event-names.constant.js';

/**
 * Event handler: Khi ma trận quyền của một Role thay đổi → xóa cache phân quyền.
 * PermissionCacheService cũng listen event này nội bộ, handler này dùng để
 * có thể mở rộng thêm hành động khác (log audit, notify...) mà không sửa cache service.
 */
@Injectable()
export class OnRolePermissionsChangedHandler {
  constructor(private readonly permissionCache: PermissionCacheService) {}

  @OnEvent(EventNames.RBAC_ROLE_PERMISSIONS_CHANGED, { async: true })
  async handle(event: RolePermissionsChangedEvent): Promise<void> {
    await this.permissionCache.invalidateByRole(event.roleId);
  }
}
