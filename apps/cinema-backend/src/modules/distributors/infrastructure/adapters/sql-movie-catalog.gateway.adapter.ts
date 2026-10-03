import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type {
  DistributorMovieCriteria,
  DistributorMovieRow,
  IMovieCatalogGateway,
} from '../../domain/ports/movie-catalog.gateway.port.js';

/**
 * Adapter đọc dữ liệu module `movies` — nơi DUY NHẤT của distributors được chạm vào phim.
 *
 * TODO(movies): khi module movies công bố public-api, thay ruột file này bằng MoviesFacade
 * (hoặc chuyển hẳn `GET /distributors/:id/movies` sang module movies — xem ghi chú bàn giao
 * để tránh phụ thuộc vòng distributors ↔ movies).
 */
@Injectable()
export class SqlMovieCatalogGatewayAdapter implements IMovieCatalogGateway {
  constructor(private readonly dataSource: DataSource) {}

  async countByDistributor(distributorId: string): Promise<number> {
    const result = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(m.id)', 'count')
      .from('movies', 'm')
      .where('m.distributor_id = :id', { id: distributorId })
      .getRawOne<{ count: string }>();

    return Number(result?.count || 0);
  }

  async findByDistributor(
    distributorId: string,
    criteria: DistributorMovieCriteria,
  ): Promise<{ items: DistributorMovieRow[]; total: number }> {
    const { status, page, limit } = criteria;

    // 'Movie' resolve qua metadata TypeORM nên không phải import entity của module khác.
    const qb = this.dataSource
      .getRepository<DistributorMovieRow>('Movie')
      .createQueryBuilder('movie')
      .select([
        'movie.id',
        'movie.title',
        'movie.originalTitle',
        'movie.durationMinutes',
        'movie.releaseDate',
        'movie.ageRating',
        'movie.status',
      ])
      .where('movie.distributorId = :id', { id: distributorId });

    if (status) qb.andWhere('movie.status = :status', { status });

    const [items, total] = await qb
      .orderBy('movie.releaseDate', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total };
  }
}
