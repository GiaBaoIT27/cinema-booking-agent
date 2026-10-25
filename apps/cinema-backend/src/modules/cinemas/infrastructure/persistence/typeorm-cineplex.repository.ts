import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';

import { Cineplex } from '../../domain/entities/cineplex.entity.js';
import type { TransactionContext } from '../../domain/ports/transaction.port.js';
import type {
  CineplexSearchCriteria,
  CineplexWithDistance,
  ICineplexRepository,
} from '../../domain/repositories/cineplex.repository.interface.js';
import { repositoryOf } from './typeorm-unit-of-work.js';

/** Công thức Haversine (km). Tham số: :latitude, :longitude. */
const DISTANCE_KM_EXPR = `(
  6371 * acos(
    least(1.0, greatest(-1.0,
      cos(radians(:latitude)) * cos(radians(c.latitude)) *
      cos(radians(c.longitude) - radians(:longitude)) +
      sin(radians(:latitude)) * sin(radians(c.latitude))
    ))
  )
)`;

@Injectable()
export class TypeOrmCineplexRepository implements ICineplexRepository {
  constructor(
    @InjectRepository(Cineplex)
    private readonly repo: Repository<Cineplex>,
  ) {}

  async search(
    criteria: CineplexSearchCriteria,
  ): Promise<{ items: CineplexWithDistance[]; total: number }> {
    const { provinceId, wardId, status, keyword, geo, page, limit } = criteria;
    const qb = this.repo.createQueryBuilder('c');

    if (provinceId) qb.andWhere('c.provinceId = :provinceId', { provinceId });
    if (wardId) qb.andWhere('c.wardId = :wardId', { wardId });
    if (status) qb.andWhere('c.status = :status', { status });
    if (keyword) {
      qb.andWhere(
        '(c.code ILIKE :search OR c.name ILIKE :search OR c.address ILIKE :search)',
        { search: `%${keyword}%` },
      );
    }

    if (geo) {
      qb.addSelect(DISTANCE_KM_EXPR, 'distanceKm')
        .setParameters({ latitude: geo.latitude, longitude: geo.longitude })
        .groupBy('c.id')
        .having(`${DISTANCE_KM_EXPR} <= :radiusKm`, { radiusKm: geo.radiusKm })
        .orderBy(' "distanceKm"', 'ASC')
        .addOrderBy('c.name', 'ASC');
    } else {
      qb.orderBy('c.name', 'ASC');
    }

    qb.skip((page - 1) * limit).take(limit);

    const { entities, raw } = await qb.getRawAndEntities();

    // Đếm tổng: bỏ phân trang, đếm số dòng (an toàn khi có GROUP BY / HAVING)
    const countQb = qb.clone();
    countQb.skip(undefined).take(undefined);
    const total = (await countQb.getRawMany()).length;

    const items = entities.map((cineplex, index) => {
      const distance = raw[index]?.distanceKm;
      return {
        cineplex,
        distanceKm:
          distance !== null && distance !== undefined ? Number(distance) : null,
      };
    });

    return { items, total };
  }

  findById(id: string, tx?: TransactionContext): Promise<Cineplex | null> {
    return repositoryOf(Cineplex, this.repo, tx).findOne({ where: { id } });
  }

  existsById(id: string): Promise<boolean> {
    return this.repo.exists({ where: { id } });
  }

  existsByCode(code: string, excludeId?: string): Promise<boolean> {
    return this.repo.exists({
      where: excludeId ? { code, id: Not(excludeId) } : { code },
    });
  }

  create(data: Partial<Cineplex>): Cineplex {
    return this.repo.create(data);
  }

  save(cineplex: Cineplex, tx?: TransactionContext): Promise<Cineplex> {
    return repositoryOf(Cineplex, this.repo, tx).save(cineplex);
  }
}
