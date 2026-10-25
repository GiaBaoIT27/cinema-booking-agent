import { Cineplex } from '../entities/cineplex.entity.js';
import { CineplexStatus } from '../enums/cineplex-status.enum.js';
import type { TransactionContext } from '../ports/transaction.port.js';

export interface CineplexSearchCriteria {
  provinceId?: string;
  wardId?: string;
  status?: CineplexStatus;
  keyword?: string;
  /** Có giá trị → lọc theo bán kính & sắp xếp theo khoảng cách. */
  geo?: { latitude: number; longitude: number; radiusKm: number };
  page: number;
  limit: number;
}

export interface CineplexWithDistance {
  cineplex: Cineplex;
  distanceKm: number | null;
}

export interface ICineplexRepository {
  search(
    criteria: CineplexSearchCriteria,
  ): Promise<{ items: CineplexWithDistance[]; total: number }>;

  findById(id: string, tx?: TransactionContext): Promise<Cineplex | null>;

  existsById(id: string): Promise<boolean>;

  /** Truyền excludeId để bỏ qua chính bản ghi đang sửa. */
  existsByCode(code: string, excludeId?: string): Promise<boolean>;

  create(data: Partial<Cineplex>): Cineplex;

  save(cineplex: Cineplex, tx?: TransactionContext): Promise<Cineplex>;
}

export const CINEPLEX_REPOSITORY = Symbol('CINEPLEX_REPOSITORY');
