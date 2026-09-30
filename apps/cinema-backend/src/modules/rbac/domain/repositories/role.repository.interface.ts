import { Role } from '../entities/role.entity.js';

/**
 * Interface repository cho Role.
 */
export interface IRoleRepository {
  findAll(options: {
    keyword?: string;
    page: number;
    limit: number;
  }): Promise<{ items: Role[]; total: number }>;

  findById(id: string): Promise<Role | null>;

  findByIdWithPermissions(id: string): Promise<Role | null>;

  findByCode(code: string): Promise<Role | null>;

  findByCodeOrName(code: string, name: string): Promise<Role | null>;

  findByName(name: string, excludeId?: string): Promise<Role | null>;

  findByIds(ids: string[]): Promise<Role[]>;

  countByIds(ids: string[]): Promise<number>;

  countUsersAssigned(roleId: string): Promise<number>;

  save(role: Role): Promise<Role>;

  create(data: Partial<Role>): Role;

  delete(id: string): Promise<void>;
}

export const ROLE_REPOSITORY = Symbol('ROLE_REPOSITORY');
