import { UserRole } from '../entities/user-role.entity.js';

/**
 * Interface repository cho UserRole.
 */
export interface IUserRoleRepository {
  findByUserId(userId: string): Promise<UserRole[]>;

  findById(id: string): Promise<UserRole | null>;

  /** Kiểm tra trùng lặp: userId + roleId + cineplexId (NULL-safe) */
  existsDuplicate(
    userId: string,
    roleId: string,
    cineplexId: string | null,
  ): Promise<boolean>;

  /**
   * Lấy tất cả permission codes của user tại scope nhất định.
   * Nếu cineplexId = null → lấy quyền GLOBAL scope.
   */
  getPermissionCodes(userId: string, cineplexId?: string): Promise<string[]>;

  /** Lấy danh sách cineplexId mà user được gán role (Scoped) */
  getCineplexScopes(userId: string): Promise<string[]>;

  save(userRole: UserRole): Promise<UserRole>;

  saveMany(userRoles: UserRole[]): Promise<UserRole[]>;

  create(data: Partial<UserRole>): UserRole;

  deleteByUserId(userId: string): Promise<void>;

  deleteById(id: string): Promise<void>;
}

export const USER_ROLE_REPOSITORY = Symbol('USER_ROLE_REPOSITORY');
