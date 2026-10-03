import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, QueryFailedError, Repository } from 'typeorm';
import { Distributor } from '../../domain/entities/distributor.entity.js';
import { DistributorStatus } from '../../domain/enums/distributor-status.enum.js';
import type {
  DistributorSearchCriteria,
  IDistributorRepository,
} from '../../domain/repositories/distributor.repository.interface.js';
import { toUniqueViolation } from './unique-violation.parser.js';

/** Escape ký tự đặc biệt của LIKE/ILIKE (\, %, _) để tìm đúng chuỗi người dùng nhập. */
const escapeLike = (value: string): string => value.replace(/[\\%_]/g, '\\$&');

@Injectable()
export class TypeOrmDistributorRepository implements IDistributorRepository {
  constructor(
    @InjectRepository(Distributor)
    private readonly repo: Repository<Distributor>,
  ) {}

  async search(
    criteria: DistributorSearchCriteria,
  ): Promise<{ items: Distributor[]; total: number }> {
    const { status, name, taxCode, page, limit } = criteria;
    const qb = this.repo.createQueryBuilder('distributor');

    if (status) qb.andWhere('distributor.status = :status', { status });
    if (name) {
      qb.andWhere('distributor.name ILIKE :name', {
        name: `%${escapeLike(name)}%`,
      });
    }
    if (taxCode) {
      qb.andWhere('distributor.taxCode ILIKE :taxCode', {
        taxCode: `%${escapeLike(taxCode)}%`,
      });
    }

    qb.orderBy('distributor.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  findById(id: string): Promise<Distributor | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByIds(ids: string[]): Promise<Distributor[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.repo.find({ where: { id: In(ids) } });
  }

  exists(id: string): Promise<boolean> {
    return this.repo.exists({ where: { id } });
  }

  existsName(name: string, excludeId?: string): Promise<boolean> {
    return this.repo.exists({
      where: excludeId ? { name, id: Not(excludeId) } : { name },
    });
  }

  existsTaxCode(taxCode: string, excludeId?: string): Promise<boolean> {
    return this.repo.exists({
      where: excludeId ? { taxCode, id: Not(excludeId) } : { taxCode },
    });
  }

  create(data: Partial<Distributor>): Distributor {
    return this.repo.create(data);
  }

  async save(distributor: Distributor): Promise<Distributor> {
    try {
      return await this.repo.save(distributor);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const violation = toUniqueViolation(error);
        if (violation) throw violation;
      }
      throw error;
    }
  }

  async updateStatus(
    id: string,
    status: DistributorStatus,
  ): Promise<Pick<Distributor, 'id' | 'status' | 'updatedAt'>> {
    await this.repo.update({ id }, { status });
    return this.repo.findOneOrFail({
      where: { id },
      select: { id: true, status: true, updatedAt: true },
    });
  }
}
