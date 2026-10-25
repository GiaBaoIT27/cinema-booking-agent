import { Auditorium } from '../entities/auditorium.entity.js';
import { AuditoriumStatus } from '../enums/auditorium-status.enum.js';
import { ScreenType } from '../enums/screen-type.enum.js';
import type { TransactionContext } from '../ports/transaction.port.js';

export interface AuditoriumSearchCriteria {
  cineplexId?: string;
  screenType?: ScreenType;
  status?: AuditoriumStatus;
  page: number;
  limit: number;
}

export interface IAuditoriumRepository {
  search(
    criteria: AuditoriumSearchCriteria,
  ): Promise<{ items: Auditorium[]; total: number }>;

  findById(id: string): Promise<Auditorium | null>;

  /** Kèm `cineplex`. */
  findByIdWithCineplex(id: string): Promise<Auditorium | null>;

  /** Khóa bản ghi (pessimistic_write) — bắt buộc truyền tx. */
  findByIdForUpdate(
    id: string,
    tx: TransactionContext,
  ): Promise<Auditorium | null>;

  existsById(id: string): Promise<boolean>;

  existsByCode(
    cineplexId: string,
    code: string,
    excludeId?: string,
  ): Promise<boolean>;

  /** status = undefined → lấy mọi trạng thái. Sắp xếp theo tên. */
  findByCineplexId(
    cineplexId: string,
    status?: AuditoriumStatus,
  ): Promise<Auditorium[]>;

  create(data: Partial<Auditorium>): Auditorium;

  save(auditorium: Auditorium, tx?: TransactionContext): Promise<Auditorium>;
}

export const AUDITORIUM_REPOSITORY = Symbol('AUDITORIUM_REPOSITORY');
