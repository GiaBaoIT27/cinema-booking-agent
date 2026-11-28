/**
 * Ràng buộc phân cấp vai trò: chỉ SUPER_ADMIN mới được cấp vai trò SUPER_ADMIN
 * và mới được thay đổi vai trò/trạng thái của một tài khoản SUPER_ADMIN.
 * Nếu không, người có quyền user:assign_role (CINEMA_MANAGER) có thể tự nâng quyền.
 */
export const SUPER_ADMIN_ROLE = 'SUPER_ADMIN';

export function isSuperAdmin(roleCodes: readonly string[] | undefined | null): boolean {
  return (roleCodes ?? []).includes(SUPER_ADMIN_ROLE);
}

/** Người gọi có được cấp vai trò `targetRoleCode` cho tài khoản khác không. */
export function canGrantRole(
  callerRoles: readonly string[] | undefined | null,
  targetRoleCode: string,
): boolean {
  return targetRoleCode !== SUPER_ADMIN_ROLE || isSuperAdmin(callerRoles);
}

/** Người gọi có được đổi vai trò/khóa một tài khoản đang có `targetUserRoles` không. */
export function canManageUser(
  callerRoles: readonly string[] | undefined | null,
  targetUserRoles: readonly string[],
): boolean {
  return !isSuperAdmin(targetUserRoles) || isSuperAdmin(callerRoles);
}
