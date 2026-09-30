import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../../domain/entities/user-role.entity.js';
import { IUserRoleRepository } from '../../domain/repositories/user-role.repository.interface.js';
import { RolePermission } from '../../domain/entities/role-permission.entity.js';
import { Permission } from '../../domain/entities/permission.entity.js';

@Injectable()
export class TypeOrmUserRoleRepository implements IUserRoleRepository {
  constructor(
    @InjectRepository(UserRole)
    private readonly repo: Repository<UserRole>,
  ) {}

  async findByUserId(userId: string): Promise<UserRole[]> {
    return this.repo.find({
      where: { userId },
      relations: { role: true },
      order: { id: 'DESC' },
    });
  }

  async findById(id: string): Promise<UserRole | null> {
    return this.repo.findOne({ where: { id }, relations: { role: true } });
  }

  async existsDuplicate(
    userId: string,
    roleId: string,
    cineplexId: string | null,
  ): Promise<boolean> {
    const qb = this.repo
      .createQueryBuilder('ur')
      .where('ur.user_id = :userId', { userId })
      .andWhere('ur.role_id = :roleId', { roleId });

    if (cineplexId) {
      qb.andWhere('ur.cineplex_id = :cineplexId', { cineplexId });
    } else {
      qb.andWhere('ur.cineplex_id IS NULL');
    }

    const count = await qb.getCount();
    return count > 0;
  }

  /**
   * Resolve danh sách permission codes của user tại một scope.
   * Logic: Lấy tất cả role mà user đang có (GLOBAL + CINEPLEX nếu có cineplexId)
   * → JOIN sang role_permissions → JOIN sang permissions → lấy code.
   */
  async getPermissionCodes(
    userId: string,
    cineplexId?: string,
  ): Promise<string[]> {
    // Điều kiện lấy userRoles: luôn lấy GLOBAL + lấy thêm scoped nếu có cineplexId
    const userRoleQb = this.repo
      .createQueryBuilder('ur')
      .select('ur.role_id', 'roleId')
      .where('ur.user_id = :userId', { userId })
      .andWhere(
        cineplexId
          ? '(ur.cineplex_id IS NULL OR ur.cineplex_id = :cineplexId)'
          : 'ur.cineplex_id IS NULL',
        cineplexId ? { cineplexId } : {},
      );

    const userRoles = await userRoleQb.getRawMany();
    if (userRoles.length === 0) return [];

    const roleIds = userRoles.map((r) => r.roleId);

    const permissions = await this.repo.manager
      .createQueryBuilder(RolePermission, 'rp')
      .innerJoin(Permission, 'p', 'p.id = rp.permission_id')
      .select('p.code', 'code')
      .where('rp.role_id IN (:...roleIds)', { roleIds })
      .distinct(true)
      .getRawMany();

    return permissions.map((p) => p.code);
  }

  async getCineplexScopes(userId: string): Promise<string[]> {
    const rows = await this.repo
      .createQueryBuilder('ur')
      .select('ur.cineplex_id', 'cineplexId')
      .where('ur.user_id = :userId', { userId })
      .andWhere('ur.cineplex_id IS NOT NULL')
      .distinct(true)
      .getRawMany();

    return rows.map((r) => r.cineplexId);
  }

  async save(userRole: UserRole): Promise<UserRole> {
    return this.repo.save(userRole);
  }

  async saveMany(userRoles: UserRole[]): Promise<UserRole[]> {
    return this.repo.save(userRoles);
  }

  create(data: Partial<UserRole>): UserRole {
    return this.repo.create(data);
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.repo.delete({ userId });
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
