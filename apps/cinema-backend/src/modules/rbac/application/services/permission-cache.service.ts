import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { USER_ROLE_REPOSITORY } from '../../domain/repositories/user-role.repository.interface.js';
import type { IUserRoleRepository } from '../../domain/repositories/user-role.repository.interface.js';
import { EventNames } from '#src/common/constants/event-names.constant.js';
import { RolePermissionsChangedEvent } from '../../domain/events/role-permissions-changed.event.js';

/**
 * Cache key prefix cho permission cache trong Redis.
 * Pattern: `rbac:perm:{userId}` → JSON.stringify(permissionCodes[])
 * Pattern: `rbac:perm:{userId}:{cineplexId}` → scoped permissions
 */
export const RBAC_PERM_CACHE_PREFIX = 'rbac:perm';
const CACHE_TTL_SECONDS = 5 * 60; // 5 phút

/**
 * Service quản lý Redis cache cho permission của user.
 * - Cache được build lazy (lần đầu miss → query DB → cache)
 * - Invalidate khi role permissions thay đổi (lắng nghe event)
 * - Redis là optional — nếu không có thì bypass cache, query DB mỗi lần
 */
@Injectable()
export class PermissionCacheService {
  private readonly logger = new Logger(PermissionCacheService.name);

  constructor(
    @Inject(USER_ROLE_REPOSITORY)
    private readonly userRoleRepo: IUserRoleRepository,
    /**
     * Optional inject Redis — nếu không có REDIS_CLIENT thì cache bị bỏ qua.
     * Dùng @Optional() để module vẫn boot được ngay cả khi Redis chưa cấu hình.
     */
    @Optional() @Inject('REDIS_CLIENT') private readonly redis: any,
  ) {}

  /**
   * Lấy permissions của user (có cache).
   * @param userId ID người dùng
   * @param cineplexId Nếu có → scope rạp cụ thể, không có → global
   */
  async getPermissions(userId: string, cineplexId?: string): Promise<string[]> {
    const cacheKey = this.buildKey(userId, cineplexId);

    // 1. Thử lấy từ cache Redis
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached) as string[];
        }
      } catch (err) {
        this.logger.warn(`Redis get failed for key ${cacheKey}: ${err}`);
      }
    }

    // 2. Cache miss → query DB
    const permissions = await this.userRoleRepo.getPermissionCodes(
      userId,
      cineplexId,
    );

    // 3. Ghi vào cache (fire-and-forget)
    if (this.redis) {
      this.redis
        .set(cacheKey, JSON.stringify(permissions), 'EX', CACHE_TTL_SECONDS)
        .catch((err: any) => this.logger.warn(`Redis set failed: ${err}`));
    }

    return permissions;
  }

  /**
   * Xóa cache permission của một user cụ thể (khi role assignment thay đổi).
   */
  async invalidateUser(userId: string): Promise<void> {
    if (!this.redis) return;
    try {
      const keys: string[] = await this.redis.keys(
        `${RBAC_PERM_CACHE_PREFIX}:${userId}*`,
      );
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.debug(
          `Invalidated ${keys.length} permission cache keys for user ${userId}`,
        );
      }
    } catch (err) {
      this.logger.warn(`Redis invalidation failed for user ${userId}: ${err}`);
    }
  }

  /**
   * Xóa cache permissions của tất cả user đang giữ một role cụ thể.
   * Được gọi khi ma trận quyền của Role thay đổi.
   */
  async invalidateByRole(roleId: string): Promise<void> {
    if (!this.redis) return;
    try {
      // Lấy tất cả userId đang có role này
      const userIds: string[] = await this.redis.smembers(
        `rbac:role:${roleId}:users`,
      );
      if (userIds.length === 0) return;

      const keysToDelete: string[] = [];
      for (const uid of userIds) {
        const keys: string[] = await this.redis.keys(
          `${RBAC_PERM_CACHE_PREFIX}:${uid}*`,
        );
        keysToDelete.push(...keys);
      }

      if (keysToDelete.length > 0) {
        await this.redis.del(...keysToDelete);
        this.logger.debug(
          `Invalidated ${keysToDelete.length} permission cache keys for role ${roleId}`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `Role cache invalidation failed for role ${roleId}: ${err}`,
      );
    }
  }

  /** Handler event từ domain — khi role permissions thay đổi */
  @OnEvent(EventNames.RBAC_ROLE_PERMISSIONS_CHANGED)
  async handleRolePermissionsChanged(
    event: RolePermissionsChangedEvent,
  ): Promise<void> {
    this.logger.log(
      `Role permissions changed [roleId=${event.roleId}, action=${event.action}] — invalidating cache`,
    );
    await this.invalidateByRole(event.roleId);
  }

  private buildKey(userId: string, cineplexId?: string): string {
    return cineplexId
      ? `${RBAC_PERM_CACHE_PREFIX}:${userId}:${cineplexId}`
      : `${RBAC_PERM_CACHE_PREFIX}:${userId}`;
  }
}
