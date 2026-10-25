import type { AuditoriumSearchCriteria } from '../../domain/repositories/auditorium.repository.interface.js';

/** Port cache cho phòng chiếu và sơ đồ ghế. */
export interface IAuditoriumCache {
  getPage<T>(
    criteria: AuditoriumSearchCriteria,
    loader: () => Promise<T>,
  ): Promise<T>;

  getDetail<T>(id: string, loader: () => Promise<T>): Promise<T>;

  getSeatLayout<T>(auditoriumId: string, loader: () => Promise<T>): Promise<T>;

  /** Sau khi phòng chiếu / cụm rạp thay đổi: xóa cache phòng chiếu và cache danh sách phòng theo cụm rạp. */
  invalidateAuditoriums(): Promise<void>;

  /** Sau khi sơ đồ ghế thay đổi: xóa cache sơ đồ ghế + chi tiết của phòng và các danh sách phòng. */
  invalidateSeatLayout(auditoriumId: string): Promise<void>;
}

export const AUDITORIUM_CACHE = Symbol('AUDITORIUM_CACHE');
