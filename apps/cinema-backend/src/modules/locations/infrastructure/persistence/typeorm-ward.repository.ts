import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { Ward } from '../../domain/entities/ward.entity.js';
import type {
  IWardRepository,
  WardSearchOptions,
} from '../../domain/repositories/ward.repository.interface.js';
import {
  toContainsPattern,
  translatePersistenceError,
} from './persistence.util.js';

@Injectable()
export class TypeOrmWardRepository implements IWardRepository {
  constructor(
    @InjectRepository(Ward)
    private readonly repo: Repository<Ward>,
  ) {}

  private applyFilters(
    qb: SelectQueryBuilder<Ward>,
    filters: Pick<WardSearchOptions, 'type' | 'keyword'>,
  ): void {
    if (filters.type) {
      qb.andWhere('w.type = :type', { type: filters.type });
    }
    if (filters.keyword) {
      qb.andWhere('(w.code ILIKE :keyword OR w.name ILIKE :keyword)', {
        keyword: toContainsPattern(filters.keyword),
      });
    }
  }

  findById(id: string): Promise<Ward | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findPage(
    options: WardSearchOptions,
  ): Promise<{ items: Ward[]; total: number }> {
    const { provinceId, page, limit } = options;
    const qb = this.repo
      .createQueryBuilder('w')
      .innerJoinAndSelect('w.province', 'p');

    if (provinceId) {
      qb.andWhere('w.provinceId = :provinceId', { provinceId });
    }
    this.applyFilters(qb, options);

    const [items, total] = await qb
      .orderBy('w.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total };
  }

  async findPageByProvince(
    provinceId: string,
    options: Omit<WardSearchOptions, 'provinceId'>,
  ): Promise<{ items: Ward[]; total: number }> {
    const { page, limit } = options;
    const qb = this.repo
      .createQueryBuilder('w')
      .where('w.provinceId = :provinceId', { provinceId });

    this.applyFilters(qb, options);

    const [items, total] = await qb
      .orderBy('w.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total };
  }

  async existsByCode(code: string): Promise<boolean> {
    return (await this.repo.count({ where: { code } })) > 0;
  }

  create(data: Partial<Ward>): Ward {
    return this.repo.create(data);
  }

  async save(ward: Ward): Promise<Ward> {
    try {
      return await this.repo.save(ward);
    } catch (error) {
      throw translatePersistenceError(error);
    }
  }
}
