import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';

import { Seat } from '../../domain/entities/seat.entity.js';
import type { TransactionContext } from '../../domain/ports/transaction.port.js';
import type { ISeatRepository } from '../../domain/repositories/seat.repository.interface.js';
import { repositoryOf } from './typeorm-unit-of-work.js';

@Injectable()
export class TypeOrmSeatRepository implements ISeatRepository {
  constructor(
    @InjectRepository(Seat)
    private readonly repo: Repository<Seat>,
  ) {}

  findById(id: string): Promise<Seat | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByIds(ids: string[]): Promise<Seat[]> {
    if (!ids.length) return [];
    return this.repo.find({ where: { id: In(ids) } });
  }

  findByAuditoriumId(auditoriumId: string): Promise<Seat[]> {
    return this.repo.find({
      where: { auditoriumId },
      order: { coordY: 'ASC', coordX: 'ASC' },
    });
  }

  existsSeatNumber(
    auditoriumId: string,
    seatNumber: string,
    excludeSeatId: string,
  ): Promise<boolean> {
    return this.repo.exists({
      where: { auditoriumId, seatNumber, id: Not(excludeSeatId) },
    });
  }

  existsCoordinates(
    auditoriumId: string,
    coordX: number,
    coordY: number,
    excludeSeatId: string,
  ): Promise<boolean> {
    return this.repo.exists({
      where: { auditoriumId, coordX, coordY, id: Not(excludeSeatId) },
    });
  }

  save(seat: Seat): Promise<Seat> {
    return this.repo.save(seat);
  }

  async deleteByAuditoriumId(
    auditoriumId: string,
    tx: TransactionContext,
  ): Promise<void> {
    await repositoryOf(Seat, this.repo, tx).delete({ auditoriumId });
  }

  async insertMany(
    seats: Partial<Seat>[],
    tx: TransactionContext,
  ): Promise<void> {
    if (!seats.length) return;
    const repo = repositoryOf(Seat, this.repo, tx);
    await repo.insert(repo.create(seats));
  }
}
