import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PriceRule } from '../../domain/entities/price-rules.entity.js';
import type {
  IPriceRuleRepository,
  PriceRuleListFilter,
  PaginatedPriceRules,
  PriceRuleOverlapQuery,
  MatchingPriceRuleQuery,
} from '../../domain/repositories/price-rule.repository.interface.js';

/**
 * Adapter TypeORM của module Showtimes – nơi DUY NHẤT được phép biết TypeORM.
 * Service chỉ phụ thuộc IPriceRuleRepository (domain port).
 */
@Injectable()
export class TypeOrmPriceRuleRepository implements IPriceRuleRepository {
  constructor(
    @InjectRepository(PriceRule)
    private readonly repo: Repository<PriceRule>,
  ) {}

  findById(id: string): Promise<PriceRule | null> {
    return this.repo.findOne({ where: { id } });
  }

  /** Kèm cineplex để controller derive cineplexName */
  findByIdWithCineplex(id: string): Promise<PriceRule | null> {
    return this.repo
      .createQueryBuilder('pr')
      .leftJoinAndSelect('pr.cineplex', 'c')
      .where('pr.id = :id', { id })
      .getOne();
  }

  async findPaginated(
    filter: PriceRuleListFilter,
  ): Promise<PaginatedPriceRules> {
    const { cineplexId, projectionType, dayType, page, limit } = filter;

    const qb = this.repo
      .createQueryBuilder('pr')
      .leftJoinAndSelect('pr.cineplex', 'c');

    if (cineplexId !== undefined && cineplexId !== null) {
      qb.andWhere('pr.cineplexId = :cineplexId', {
        cineplexId: cineplexId.toString(),
      });
    }
    if (projectionType) {
      qb.andWhere('pr.projectionType = :projectionType', { projectionType });
    }
    if (dayType) {
      qb.andWhere('pr.dayType = :dayType', { dayType });
    }

    // Ưu tiên quy tắc toàn hệ thống (cineplexId NULL) trước
    qb.orderBy('pr.cineplexId', 'ASC', 'NULLS FIRST')
      .addOrderBy('pr.projectionType', 'ASC')
      .addOrderBy('pr.dayType', 'ASC')
      .addOrderBy('pr.startTime', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, totalItems] = await qb.getManyAndCount();
    return { data, totalItems };
  }

  /** Đếm số quy tắc có khung giờ giao thoa/chồng lấp với điều kiện áp dụng tương đương */
  findOverlapping(query: PriceRuleOverlapQuery): Promise<number> {
    const qb = this.repo
      .createQueryBuilder('pr')
      .where('pr.projectionType = :projectionType', {
        projectionType: query.projectionType,
      })
      .andWhere('pr.dayType = :dayType', { dayType: query.dayType })
      .andWhere('NOT (pr.endTime <= :startTime OR pr.startTime >= :endTime)', {
        startTime: query.startTime,
        endTime: query.endTime,
      });

    if (query.cineplexId !== undefined && query.cineplexId !== null) {
      qb.andWhere('pr.cineplexId = :cineplexId', {
        cineplexId: query.cineplexId.toString(),
      });
    } else {
      qb.andWhere('pr.cineplexId IS NULL');
    }

    if (query.excludeId) {
      qb.andWhere('pr.id != :excludeId', { excludeId: query.excludeId });
    }

    return qb.getCount();
  }

  /**
   * Tra quy tắc giá khớp với suất chiếu: đúng projectionType + dayType +
   * (cineplex hoặc toàn hệ thống) + khung giờ bao phủ đồng hồ suất chiếu.
   * Rule theo cụm rạp ưu tiên trước rule toàn hệ thống, cùng điều kiện lấy basePrice cao nhất.
   */
  findMatchingBasePrice(
    query: MatchingPriceRuleQuery,
  ): Promise<PriceRule | null> {
    return this.repo
      .createQueryBuilder('pr')
      .where('pr.projectionType = :projectionType', {
        projectionType: query.projectionType,
      })
      .andWhere('pr.dayType = :dayType', { dayType: query.dayType })
      .andWhere('(pr.cineplexId = :cineplexId OR pr.cineplexId IS NULL)', {
        cineplexId: query.cineplexId ?? null,
      })
      .andWhere(
        'pr.startTime <= :showtimeClock AND pr.endTime > :showtimeClock',
        { showtimeClock: query.showtimeClock },
      )
      .orderBy('pr.cineplexId IS NULL', 'ASC')
      .addOrderBy('pr.basePrice', 'DESC')
      .getOne();
  }

  create(data: Partial<PriceRule>): PriceRule {
    return this.repo.create(data);
  }

  save(rule: Partial<PriceRule> | PriceRule): Promise<PriceRule> {
    return this.repo.save(rule as PriceRule);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}

