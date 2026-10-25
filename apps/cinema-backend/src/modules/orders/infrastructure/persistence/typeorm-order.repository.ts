import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';

import { Order } from '../../domain/entities/order.entity.js';
import { OrderSeatDetail } from '../../domain/entities/order-seat-details.entity.js';
import { OrderFnbDetail } from '../../domain/entities/order-fnb-details.entity.js';
import { OrderStatus } from '../../domain/enums/order-status.enum.js';
import { FnbDetailStatus } from '../../domain/enums/fnb-detail-status.enum.js';
import type { TransactionContext } from '../../domain/ports/transaction.port.js';
import type {
  IOrderRepository,
  NewOrderData,
} from '../../domain/repositories/order.repository.interface.js';
import { managerOf, repositoryOf } from './typeorm-unit-of-work.js';

@Injectable()
export class TypeOrmOrderRepository implements IOrderRepository {
  constructor(
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,
    @InjectRepository(OrderSeatDetail)
    private readonly seatDetails: Repository<OrderSeatDetail>,
    @InjectRepository(OrderFnbDetail)
    private readonly fnbDetails: Repository<OrderFnbDetail>,
  ) {}

  findById(id: string, tx?: TransactionContext): Promise<Order | null> {
    return repositoryOf(Order, this.orders, tx).findOne({ where: { id } });
  }

  findByIdWithDetails(id: string): Promise<Order | null> {
    return this.orders.findOne({
      where: { id },
      relations: { tickets: true, seatDetails: true, fnbDetails: true },
    });
  }

  findByIdWithSeatDetails(id: string): Promise<Order | null> {
    return this.orders.findOne({
      where: { id },
      relations: { seatDetails: true },
    });
  }

  findByUser(userId: string, limit: number): Promise<Order[]> {
    return this.orders.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  findExpiredPending(now: Date): Promise<Order[]> {
    return this.orders.find({
      where: { status: OrderStatus.PENDING, expiresAt: LessThan(now) },
    });
  }

  async findSeatIds(orderId: string): Promise<string[]> {
    const rows = await this.seatDetails.find({ where: { orderId } });
    return Array.from(new Set(rows.map((row) => row.seatId)));
  }

  async createPending(
    data: NewOrderData,
    tx: TransactionContext,
  ): Promise<Order> {
    const orderRepo = repositoryOf(Order, this.orders, tx);
    const seatRepo = repositoryOf(OrderSeatDetail, this.seatDetails, tx);
    const fnbRepo = repositoryOf(OrderFnbDetail, this.fnbDetails, tx);

    const order = await orderRepo.save(
      orderRepo.create({ ...data.order, status: OrderStatus.PENDING }),
    );

    await seatRepo.save(
      seatRepo.create(
        data.seats.map((seat) => ({
          orderId: order.id,
          showtimeId: data.order.showtimeId,
          seatId: seat.seatId,
          price: seat.price,
        })),
      ),
    );

    if (data.fnbItems.length > 0) {
      await fnbRepo.save(
        fnbRepo.create(
          data.fnbItems.map((item) => ({
            ...item,
            orderId: order.id,
            status: FnbDetailStatus.PENDING,
          })),
        ),
      );
    }

    return order;
  }

  save(order: Order, tx?: TransactionContext): Promise<Order> {
    return repositoryOf(Order, this.orders, tx).save(order);
  }

  async cancelPendingFnbDetails(
    orderId: string,
    tx: TransactionContext,
  ): Promise<void> {
    await managerOf(tx)
      .createQueryBuilder()
      .update(OrderFnbDetail)
      .set({ status: FnbDetailStatus.CANCELLED })
      .where('orderId = :orderId', { orderId })
      .andWhere('status = :status', { status: FnbDetailStatus.PENDING })
      .execute();
  }
}
