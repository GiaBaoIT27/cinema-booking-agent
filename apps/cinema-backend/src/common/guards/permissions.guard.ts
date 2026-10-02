import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { PERMISSION_RESOLVER } from '../interfaces/permission-resolver.interface.js';
import type { IPermissionResolver } from '../interfaces/permission-resolver.interface.js';
import { CINEPLEX_SCOPE_KEY } from '../decorators/cineplex-scope.decorator.js';
import type { CineplexScopeOptions } from '../decorators/cineplex-scope.decorator.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    /**
     * Inject qua token — KHÔNG import trực tiếp RbacFacade để tránh
     * circular dependency và vi phạm ranh giới module.
     * RbacModule sẽ provide { token: PERMISSION_RESOLVER, useExisting: RbacFacade }.
     */
    @Inject(PERMISSION_RESOLVER)
    private readonly permissionResolver: IPermissionResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Bỏ qua nếu endpoint là @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // 2. Lấy danh sách quyền yêu cầu
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    // Không khai báo quyền → mặc định cho phép (chỉ cần đã đăng nhập)
    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    // 3. Lấy user từ request (đã được JwtAuthGuard gán)
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const userId = user?.id || user?.userId;

    if (!userId) {
      throw new ForbiddenException({
        message: 'Bạn không có quyền truy cập vào tài nguyên này.',
        errorCode: 'RBAC_FORBIDDEN',
      });
    }

    // Tài khoản SUPER_ADMIN có toàn quyền trên toàn hệ thống
    if (user.roles?.includes('SUPER_ADMIN')) {
      return true;
    }

    // 4. Xác định cineplexId nếu endpoint có @CineplexScope()
    let cineplexId: string | undefined;
    const scopeOptions = this.reflector.getAllAndOverride<CineplexScopeOptions>(
      CINEPLEX_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (scopeOptions) {
      const field = scopeOptions.key ?? 'cineplexId';
      cineplexId = request[scopeOptions.from]?.[field];
    }

    // 5. Resolve quyền qua IPermissionResolver (RbacFacade implement)
    //    Nếu có cineplexId → tra quyền theo scope rạp, ngược lại tra toàn hệ thống
    const userPermissions = await this.permissionResolver.getUserPermissions(
      String(userId),
      cineplexId,
    );

    const hasPermission = requiredPermissions.every((p) =>
      userPermissions.includes(p),
    );

    if (!hasPermission) {
      throw new ForbiddenException({
        message:
          'Thao tác bị từ chối. Tài khoản của bạn thiếu quyền hạn cần thiết.',
        errorCode: 'RBAC_INSUFFICIENT_PERMISSIONS',
      });
    }

    return true;
  }
}
