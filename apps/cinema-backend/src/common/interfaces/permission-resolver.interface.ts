/**
 * Token dùng để inject IPermissionResolver vào Guards/Services mà không cần
 * import trực tiếp module rbac (tránh circular dependency và vi phạm ranh giới module).
 * RbacFacade (ở rbac module) sẽ implement interface này và được đăng ký dưới token này.
 */
export const PERMISSION_RESOLVER = Symbol('PERMISSION_RESOLVER');

export interface IPermissionResolver {
  /**
   * Trả về danh sách permission code mà user có trong phạm vi (scope) nhất định.
   * @param userId ID của người dùng cần tra quyền
   * @param cineplexId  Nếu có: tra quyền theo phạm vi rạp cụ thể (Scoped RBAC).
   *                   Nếu null/undefined: tra quyền toàn hệ thống.
   */
  getUserPermissions(userId: string, cineplexId?: string): Promise<string[]>;
  getUserRoles(userId: string): Promise<string[]>;

  /**
   * Trả về danh sách cineplexId mà user đang được gán role (để kiểm tra scope).
   */
  getUserCineplexScopes(userId: string): Promise<string[]>;
}
