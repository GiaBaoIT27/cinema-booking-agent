import { SetMetadata } from '@nestjs/common';

export const CINEPLEX_SCOPE_KEY = 'cineplexScope';

export interface CineplexScopeOptions {
  /** Nguồn lấy cineplexId: từ route param hay request body */
  from: 'params' | 'body' | 'query';
  /** Tên field chứa cineplexId (mặc định: 'cineplexId') */
  key?: string;
}

/**
 * Decorator khai báo rằng endpoint này cần kiểm tra quyền theo phạm vi rạp (Scoped RBAC).
 * PermissionsGuard sẽ đọc metadata này để biết lấy cineplexId từ đâu và gọi
 * IPermissionResolver.getUserPermissions(userId, cineplexId) thay vì check toàn hệ thống.
 *
 * @example
 * @CineplexScope({ from: 'params', key: 'cineplexId' })
 * @RequirePermissions('cinema:update')
 * @Patch('cineplexes/:cineplexId')
 * update(...) {}
 */
export const CineplexScope = (options: CineplexScopeOptions) =>
  SetMetadata(CINEPLEX_SCOPE_KEY, { key: 'cineplexId', ...options });
