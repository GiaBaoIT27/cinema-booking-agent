/**
 * Cấu trúc của đối tượng user được JwtStrategy gắn vào request.user
 * sau khi xác thực JWT thành công.
 * Được dùng bởi @CurrentUser() decorator và PermissionsGuard.
 */
export interface IAuthenticatedUser {
  /** UUID của user */
  id: string;

  /** Email đăng nhập */
  email: string;

  /** Danh sách role code của user (ví dụ: ['SUPER_ADMIN', 'CINEMA_MANAGER']) */
  roles: string[];

  /** Danh sách permission code đã được resolve (tuỳ chọn — rbac có thể gắn thêm sau JWT verify) */
  permissions?: string[];
}
