import { Injectable, Inject } from '@nestjs/common';
import type { IPermissionResolver } from '#src/common/interfaces/permission-resolver.interface.js';
import { USER_ROLE_REPOSITORY } from '../domain/repositories/user-role.repository.interface.js';
import type { IUserRoleRepository } from '../domain/repositories/user-role.repository.interface.js';
import { PERMISSION_REPOSITORY } from '../domain/repositories/permission.repository.interface.js';
import type { IPermissionRepository } from '../domain/repositories/permission.repository.interface.js';
import { PermissionCacheService } from '../application/services/permission-cache.service.js';
import { PermissionSummaryDto } from './dto/permission-summary.dto.js';

/**
 * Facade công khai của RBAC module — cổng giao tiếp duy nhất giữa RBAC và các module khác.
 *
 * Implements `IPermissionResolver` để cung cấp cho PermissionsGuard và Auth module
 * khả năng giải quyết quyền hạn của người dùng mà không cần truy cập trực tiếp vào DB của RBAC.
 */
@Injectable()
export class RbacFacade implements IPermissionResolver {
  constructor(
    @Inject(USER_ROLE_REPOSITORY)
    private readonly userRoleRepository: IUserRoleRepository,
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissionRepository: IPermissionRepository,
    private readonly permissionCacheService: PermissionCacheService,
  ) {}

  /**
   * Lấy danh sách mã quyền hạn (permission codes) của user.
   * Ưu tiên đọc qua cache (Redis) và fallback xuống DB nếu cache miss.
   *
   * @param userId ID người dùng
   * @param cineplexId ID rạp (nếu kiểm tra quyền theo cụm rạp)
   */
  async getUserPermissions(
    userId: string,
    cineplexId?: string,
  ): Promise<string[]> {
    return this.permissionCacheService.getPermissions(userId, cineplexId);
  }

  async getUserRoles(userId: string): Promise<string[]> {
    const scopes = await this.userRoleRepository.findByUserId(userId);
    return Array.from(new Set(scopes.map(s => s.role.code)));
  }

  /**
   * Lấy danh sách các cụm rạp mà user này có vai trò được gán (Scoped).
   */
  async getUserCineplexScopes(userId: string): Promise<string[]> {
    return this.userRoleRepository.getCineplexScopes(userId);
  }

  /**
   * Xóa cache quyền hạn của một người dùng cụ thể.
   * Được gọi khi phân quyền của user bị thay đổi hoặc user bị khóa.
   */
  async invalidateUserPermissions(userId: string): Promise<void> {
    await this.permissionCacheService.invalidateUser(userId);
  }

  /**
   * Lấy danh sách tóm tắt tất cả các quyền hạn trong hệ thống.
   */
  async getAllPermissions(): Promise<PermissionSummaryDto[]> {
    const { items } = await this.permissionRepository.findAll({
      page: 1,
      limit: 1000,
    });

    return items.map((p) => ({
      code: p.code,
      name: p.name,
      module: p.module,
      description: p.description,
    }));
  }
}
