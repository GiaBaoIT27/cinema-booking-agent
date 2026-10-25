import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Ticket } from '../../domain/entities/ticket.entity.js';
import { Order } from '../../domain/entities/order.entity.js';
import type { TransactionContext } from '../../domain/ports/transaction.port.js';
import type {
  ITicketRepository,
  NewTicketData,
  TicketSearchCriteria,
} from '../../domain/repositories/ticket.repository.interface.js';
import { repositoryOf } from './typeorm-unit-of-work.js';

@Injectable()
export class TypeOrmTicketRepository implements ITicketRepository {
  constructor(
    @InjectRepository(Ticket)
    private readonly repo: Repository<Ticket>,
  ) {}

  async createMany(
    tickets: NewTicketData[],
    tx: TransactionContext,
  ): Promise<void> {
    if (tickets.length === 0) return;
    const repo = repositoryOf(Ticket, this.repo, tx);
    await repo.save(repo.create(tickets));
  }

  async search(
    criteria: TicketSearchCriteria,
  ): Promise<{ items: Ticket[]; total: number }> {
    const { ownerUserId, orderId, showtimeId, status, ticketCode, page, limit } =
      criteria;

    const qb = this.repo
      .createQueryBuilder('t')
      .innerJoin(Order, 'o', 'o.id = t.orderId');

    if (ownerUserId) qb.andWhere('o.userId = :ownerUserId', { ownerUserId });
    if (orderId) qb.andWhere('t.orderId = :orderId', { orderId });
    if (showtimeId) qb.andWhere('t.showtimeId = :showtimeId', { showtimeId });
    if (status) qb.andWhere('t.status = :status', { status });
    if (ticketCode) {
      qb.andWhere('t.ticketCode ILIKE :ticketCode', {
        ticketCode: `%${ticketCode}%`,
      });
    }

    const [items, total] = await qb
      .orderBy('t.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total };
  }
}
