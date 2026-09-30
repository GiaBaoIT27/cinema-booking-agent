import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Not, Repository } from 'typeorm';
import { Role } from '../../domain/entities/role.entity.js';
import { IRoleRepository } from '../../domain/repositories/role.repository.interface.js';
import { UserRole } from '../../domain/entities/user-role.entity.js';

@Injectable()
export class TypeOrmRoleRepository implements IRoleRepository {
  constructor(
    @InjectRepository(Role)
    private readonly repo: Repository<Role>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(options: { keyword?: string; page: number; limit: number }): Promise<{ items: Role[]; total: number }> {
    const { keyword, page, limit } = options;
    const qb = this.repo
      .createQueryBuilder('role')
      .select(['role.id', 'role.code', 'role.name', 'role.description', 'role.isSystem', 'role.createdAt', 'role.updatedAt']);

    if (keyword) {
      const like = `%${keyword.trim()}%`;
      qb.andWhere(
        new (await import('typeorm')).Brackets((qb2) =>
          qb2.where('role.code ILIKE :k', { k: like }).orWhere('role.name ILIKE :k', { k: like }),
        ),
      );
    }

    qb.orderBy('role.id', 'ASC').skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async findById(id: string): Promise<Role | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByIdWithPermissions(id: string): Promise<Role | null> {
    return this.repo.findOne({
      where: { id },
      relations: { rolePermissions: { permission: true } },
    });
  }

  async findByCode(code: string): Promise<Role | null> {
    return this.repo.findOne({ where: { code } });
  }

  async findByCodeOrName(code: string, name: string): Promise<Role | null> {
    return this.repo.findOne({ where: [{ code }, { name }] });
  }

  async findByName(name: string, excludeId?: string): Promise<Role | null> {
    return this.repo.findOne({
      where: excludeId ? { name, id: Not(excludeId) } : { name },
    });
  }

  async findByIds(ids: string[]): Promise<Role[]> {
    return this.repo.find({ where: { id: In(ids) } });
  }

  async countByIds(ids: string[]): Promise<number> {
    return this.repo.count({ where: { id: In(ids) } });
  }

  async countUsersAssigned(roleId: string): Promise<number> {
    return this.dataSource.manager.count(UserRole, {
      where: { roleId },
    });
  }

  async save(role: Role): Promise<Role> {
    return this.repo.save(role);
  }

  create(data: Partial<Role>): Role {
    return this.repo.create(data);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
