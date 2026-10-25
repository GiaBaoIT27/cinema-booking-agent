import type { CineplexSearchCriteria } from '../../domain/repositories/cineplex.repository.interface.js';

/**
 * Port cache cho cụm rạp. Application chỉ biết "cái gì được cache";
 * key, TTL, cơ chế xóa theo pattern thuộc về infrastructure.
 */
export interface ICineplexCache {
  getPage<T>(
    criteria: CineplexSearchCriteria,
    loader: () => Promise<T>,
  ): Promise<T>;

  getDetail<T>(id: string, loader: () => Promise<T>): Promise<T>;

  getAuditoriums<T>(
    cineplexId: string,
    status: string,
    loader: () => Promise<T>,
  ): Promise<T>;

  getFnbItems<T>(
    cineplexId: string,
    category: string | undefined,
    loader: () => Promise<T>,
  ): Promise<T>;

  invalidateAll(): Promise<void>;
}

export const CINEPLEX_CACHE = Symbol('CINEPLEX_CACHE');
