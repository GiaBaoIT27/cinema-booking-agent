import { Seat } from '../entities/seat.entity.js';
import type { TransactionContext } from '../ports/transaction.port.js';

export interface ISeatRepository {
  findById(id: string): Promise<Seat | null>;

  findByIds(ids: string[]): Promise<Seat[]>;

  /** Sắp xếp theo coordY, coordX tăng dần. */
  findByAuditoriumId(auditoriumId: string): Promise<Seat[]>;

  existsSeatNumber(
    auditoriumId: string,
    seatNumber: string,
    excludeSeatId: string,
  ): Promise<boolean>;

  existsCoordinates(
    auditoriumId: string,
    coordX: number,
    coordY: number,
    excludeSeatId: string,
  ): Promise<boolean>;

  save(seat: Seat): Promise<Seat>;

  deleteByAuditoriumId(
    auditoriumId: string,
    tx: TransactionContext,
  ): Promise<void>;

  insertMany(seats: Partial<Seat>[], tx: TransactionContext): Promise<void>;
}

export const SEAT_REPOSITORY = Symbol('SEAT_REPOSITORY');
