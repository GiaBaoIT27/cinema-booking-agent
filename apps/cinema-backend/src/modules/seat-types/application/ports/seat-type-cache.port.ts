import type { SeatType } from '../../domain/entities/seat-type.entity.js';

/**
 * Port cache cho loại ghế. Application layer chỉ biết "có cache",
 * không biết Redis, key hay TTL (xem infrastructure/cache).
 */
export interface ISeatTypeCache {
  getAll(loader: () => Promise<SeatType[]>): Promise<SeatType[]>;

  getById(
    id: string,
    loader: () => Promise<SeatType | null>,
  ): Promise<SeatType | null>;

  /** Xóa cache danh sách; nếu có id thì xóa luôn cache chi tiết của id đó */
  invalidate(id?: string): Promise<void>;
}

export const SEAT_TYPE_CACHE = Symbol('SEAT_TYPE_CACHE');
