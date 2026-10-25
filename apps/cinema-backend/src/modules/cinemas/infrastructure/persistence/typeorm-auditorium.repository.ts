import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Not, Repository } from 'typeorm';

import { Auditorium } from '../../domain/entities/auditorium.entity.js';
import { AuditoriumStatus } from '../../domain/enums/auditorium-status.enum.js';
import type { TransactionContext } from '../../domain/ports/transaction.port.js';
import type {
  AuditoriumSearchCriteria,
  IAuditoriumRepository,
} from '../../domain/repositories/auditorium.repository.interface.js';
import { repositoryOf } from './typeorm-unit-of-work.js';

@Injectable()
export class TypeOrmAuditoriumRepository implements IAuditoriumRepository {
  constructor(
    @InjectRepository(Auditorium)
    private readonly repo: Repository<Auditorium>,
  ) {}

  async search(
    criteria: AuditoriumSearchCriteria,
  ): Promise<{ items: Auditorium[]; total: number }> {
    const { cineplexId, screenType, status, page, limit } = criteria;
    const qb = this.repo
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.cineplex', 'c');

    if (cineplexId) qb.andWhere('a.cineplexId = :cineplexId', { cineplexId });
    if (screenType) qb.andWhere('a.screenType = :screenType', { screenType });
    if (status) qb.andWhere('a.status = :status', { status });

    qb.orderBy('a.cineplexId', 'ASC')
      .addOrderBy('a.code', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  findById(id: string): Promise<Auditorium | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByIdWithCineplex(id: string): Promise<Auditorium | null> {
    return this.repo
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.cineplex', 'c')
      .where('a.id = :id', { id })
      .getOne();
  }

  findByIdForUpdate(
    id: string,
    tx: TransactionContext,
  ): Promise<Auditorium | null> {
    return repositoryOf(Auditorium, this.repo, tx).findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
  }

  existsById(id: string): Promise<boolean> {
    return this.repo.exists({ where: { id } });
  }

  existsByCode(
    cineplexId: string,
    code: string,
    excludeId?: string,
  ): Promise<boolean> {
    return this.repo.exists({
      where: excludeId
        ? { cineplexId, code, id: Not(excludeId) }
        : { cineplexId, code },
    });
  }

  findByCineplexId(
    cineplexId: string,
    status?: AuditoriumStatus,
  ): Promise<Auditorium[]> {
    const where: FindOptionsWhere<Auditorium> = { cineplexId };
    if (status) where.status = status;

    return this.repo.find({ where, order: { name: 'ASC' } });
  }

  create(data: Partial<Auditorium>): Auditorium {
    return this.repo.create(data);
  }

  save(auditorium: Auditorium, tx?: TransactionContext): Promise<Auditorium> {
    return repositoryOf(Auditorium, this.repo, tx).save(auditorium);
  }
}
