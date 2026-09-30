import { Permission } from '../entities/permission.entity.js';

/**
 * Interface repository cho Permission — domain layer định nghĩa,
 * infrastructure layer implement (TypeORM).
 * Services inject qua token này thay vì import TypeORM Repository trực tiếp.
 */
export interface IPermissionRepository {
  findAll(options: {
    module?: string;
    search?: string;
    page: number;
    limit: number;
  }): Promise<{ items: Permission[]; total: number }>;

  findById(id: string): Promise<Permission | null>;

  findByCode(code: string): Promise<Permission | null>;

  findByIds(ids: string[]): Promise<Permission[]>;

  countByRoleId(permissionId: string): Promise<number>;

  save(permission: Permission): Promise<Permission>;

  create(data: Partial<Permission>): Permission;

  delete(id: string): Promise<void>;

  getModuleStats(): Promise<Array<{ module: string; totalPermissions: number }>>;
}

export const PERMISSION_REPOSITORY = Symbol('PERMISSION_REPOSITORY');
