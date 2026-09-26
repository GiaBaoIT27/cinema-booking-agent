import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Nếu API là @Public(), bỏ qua không cần check quyền
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // 2. Lấy danh sách các quyền yêu cầu được định nghĩa tại Controller/Route
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Nếu không cấu hình quyền yêu cầu, mặc định cho phép truy cập
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // 3. Lấy thông tin user từ request (được JwtAuthGuard gán vào trước đó)
    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.permissions) {
      throw new ForbiddenException({
        message: 'Bạn không có quyền truy cập vào tài nguyên này.',
        errorCode: 'FORBIDDEN_RESOURCE',
      });
    }

    // 4. Kiểm tra xem user có sở hữu đầy đủ quyền yêu cầu hay không (Scoped Match)
    const hasPermission = requiredPermissions.every((permission) =>
      user.permissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException({
        message:
          'Thao tác bị từ chối. Tài khoản của bạn thiếu quyền hạn cần thiết.',
        errorCode: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    return true;
  }
}
