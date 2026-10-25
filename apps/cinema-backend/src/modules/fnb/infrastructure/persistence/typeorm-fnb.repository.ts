import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';

import { FnbItem } from '../../domain/entities/fnb-item.entities.js';
import { FnbCategory } from '../../domain/enums/fnb-category.enum.js';
import type {
  FnbItemFilters,
  IFnbRepository,
} from '../../domain/repositories/fnb.repository.interface.js';

/**
 * Adapter TypeORM của module F&B – nơi DUY NHẤT được phép biết TypeORM.
 * Service chỉ phụ thuộc IFnbRepository (domain port).
 */
@Injectable()
export class TypeOrmFnbRepository implements IFnbRepository {
  constructor(
    @InjectRepository(FnbItem)
    private readonly repo: Repository<FnbItem>,
  ) {}

  findAll(): Promise<FnbItem[]> {
    return this.repo.find({ order: { category: 'ASC', name: 'ASC' } });
  }

  async findMany(
    filters: FnbItemFilters,
  ): Promise<{ items: FnbItem[]; totalItems: number }> {
    const { category, type, isActive, keyword, page, limit } = filters;

    const qb = this.repo.createQueryBuilder('fnb');

    if (category) qb.andWhere('fnb.category = :category', { category });
    if (type) qb.andWhere('fnb.type = :type', { type });
    if (isActive !== undefined)
      qb.andWhere('fnb.is_active = :isActive', { isActive });
    if (keyword) {
      qb.andWhere('(fnb.sku ILIKE :keyword OR fnb.name ILIKE :keyword)', {
        keyword: `%${keyword}%`,
      });
    }

    qb.orderBy('fnb.category', 'ASC')
      .addOrderBy('fnb.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, totalItems] = await qb.getManyAndCount();
    return { items, totalItems };
  }

  findById(id: string): Promise<FnbItem | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByIds(ids: string[]): Promise<FnbItem[]> {
    const uniqueIds = [...new Set(ids)];
    if (!uniqueIds.length) return [];
    return this.repo.find({
      where: { id: In(uniqueIds) },
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  findActive(category?: string): Promise<FnbItem[]> {
    return this.repo.find({
      where: {
        isActive: true,
        ...(category ? { category: category as FnbCategory } : {}),
      },
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  async existsById(id: string): Promise<boolean> {
    return (await this.repo.count({ where: { id } })) > 0;
  }

  async existsBySku(sku: string, excludeId?: string): Promise<boolean> {
    const count = await this.repo.count({
      where: excludeId ? { sku, id: Not(excludeId) } : { sku },
    });
    return count > 0;
  }

  async existsByName(name: string, excludeId?: string): Promise<boolean> {
    const count = await this.repo.count({
      where: excludeId ? { name, id: Not(excludeId) } : { name },
    });
    return count > 0;
  }

  create(data: Partial<FnbItem>): FnbItem {
    return this.repo.create(data);
  }

  save(fnbItem: FnbItem): Promise<FnbItem> {
    return this.repo.save(fnbItem);
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
