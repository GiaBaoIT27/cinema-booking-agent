import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { Permission } from '../../domain/entities/permission.entity.js';
import { IPermissionRepository } from '../../domain/repositories/permission.repository.interface.js';
import { RolePermission } from '../../domain/entities/role-permission.entity.js';

@Injectable()
export class TypeOrmPermissionRepository implements IPermissionRepository {
  constructor(
    @InjectRepository(Permission)
    private readonly repo: Repository<Permission>,
  ) {}

  async findAll(options: {
    module?: string;
    search?: string;
    page: number;
    limit: number;
  }): Promise<{ items: Permission[]; total: number }> {
    const { module, search, page, limit } = options;
    const qb = this.repo
      .createQueryBuilder('p')
      .select(['p.id', 'p.code', 'p.name', 'p.module', 'p.description', 'p.createdAt', 'p.updatedAt']);

    if (module) {
      qb.andWhere('p.module = :module', { module });
    }
    if (search) {
      const like = `%${search}%`;
      qb.andWhere(
        new Brackets((qb2) =>
          qb2
            .where('p.code ILIKE :s', { s: like })
            .orWhere('p.description ILIKE :s', { s: like }),
        ),
      );
    }

    qb.orderBy('p.module', 'ASC').addOrderBy('p.code', 'ASC').skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async findById(id: string): Promise<Permission | null> {
    return this.repo.findOne({
      where: { id },
      relations: { rolePermissions: { role: true } },
    });
  }

  async findByCode(code: string): Promise<Permission | null> {
    return this.repo.findOne({ where: { code } });
  }

  async findByIds(ids: string[]): Promise<Permission[]> {
    return this.repo.find({ where: { id: In(ids) } });
  }

  async countByRoleId(permissionId: string): Promise<number> {
    return this.repo.manager.count(RolePermission, {
      where: { permission: { id: permissionId } },
    });
  }

  async save(permission: Permission): Promise<Permission> {
    return this.repo.save(permission);
  }

  create(data: Partial<Permission>): Permission {
    return this.repo.create(data);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async getModuleStats(): Promise<Array<{ module: string; totalPermissions: number }>> {
    const raw = await this.repo
      .createQueryBuilder('p')
      .select('p.module', 'module')
      .addSelect('COUNT(p.id)', 'totalPermissions')
      .groupBy('p.module')
      .orderBy('p.module', 'ASC')
      .getRawMany();

    return raw.map((row) => ({
      module: String(row.module).toUpperCase(),
      totalPermissions: Number(row.totalPermissions),
    }));
  }
}
