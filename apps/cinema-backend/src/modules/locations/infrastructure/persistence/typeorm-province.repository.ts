import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Province } from '../../domain/entities/province.entity.js';
import type {
  IProvinceRepository,
  ProvinceSearchOptions,
} from '../../domain/repositories/province.repository.interface.js';
import {
  toContainsPattern,
  translatePersistenceError,
} from './persistence.util.js';

@Injectable()
export class TypeOrmProvinceRepository implements IProvinceRepository {
  constructor(
    @InjectRepository(Province)
    private readonly repo: Repository<Province>,
  ) {}

  findById(id: string): Promise<Province | null> {
    return this.repo.findOne({ where: { id } });
  }

  findAllOrderedByCode(): Promise<Province[]> {
    return this.repo.find({ order: { code: 'ASC' } });
  }

  async findPage(
    options: ProvinceSearchOptions,
  ): Promise<{ items: Province[]; total: number }> {
    const { type, keyword, page, limit } = options;
    const qb = this.repo.createQueryBuilder('p');

    if (type) {
      qb.andWhere('p.type = :type', { type });
    }
    if (keyword) {
      qb.andWhere('(p.code ILIKE :keyword OR p.name ILIKE :keyword)', {
        keyword: toContainsPattern(keyword),
      });
    }

    const [items, total] = await qb
      .orderBy('p.code', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total };
  }

  async existsById(id: string): Promise<boolean> {
    return (await this.repo.count({ where: { id } })) > 0;
  }

  async existsByCode(code: string): Promise<boolean> {
    return (await this.repo.count({ where: { code } })) > 0;
  }

  async existsByName(name: string): Promise<boolean> {
    return (await this.repo.count({ where: { name } })) > 0;
  }

  create(data: Partial<Province>): Province {
    return this.repo.create(data);
  }

  async save(province: Province): Promise<Province> {
    try {
      return await this.repo.save(province);
    } catch (error) {
      throw translatePersistenceError(error);
    }
  }
}
