import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, MoreThan, Repository } from 'typeorm';

import { ShowtimeSeat } from '../../domain/entities/showtime-seat.entity.js';
import { ShowtimeSeatStatus } from '../../domain/enums/showtime-seat-status.js';
import type { IShowtimeSeatRepository } from '../../domain/repositories/showtime-seat.repository.interface.js';

/** Adapter TypeORM của module Showtimes – nơi DUY NHẤT được phép biết TypeORM. */
@Injectable()
export class TypeOrmShowtimeSeatRepository implements IShowtimeSeatRepository {
  constructor(
    @InjectRepository(ShowtimeSeat)
    private readonly repo: Repository<ShowtimeSeat>,
  ) {}

  findByShowtimeId(showtimeId: string): Promise<ShowtimeSeat[]> {
    return this.repo.find({
      where: { showtimeId },
      order: { seatId: 'ASC' },
    });
  }

  async findBookedSeatIds(
    showtimeId: string,
    seatIds: string[],
  ): Promise<string[]> {
    const rows = await this.repo.find({
      where: {
        showtimeId,
        seatId: In(seatIds),
        status: ShowtimeSeatStatus.BOOKED,
      },
    });
    return rows.map((row) => row.seatId);
  }

  findActiveHolds(
    showtimeId: string,
    seatIds: string[],
    userId: string,
    now: Date,
  ): Promise<ShowtimeSeat[]> {
    return this.repo.find({
      where: {
        showtimeId,
        seatId: In(seatIds),
        userId,
        status: ShowtimeSeatStatus.HOLDING,
        holdExpiresAt: MoreThan(now),
      },
    });
  }

  findActiveHoldsByUser(userId: string, now: Date): Promise<ShowtimeSeat[]> {
    return this.repo.find({
      where: {
        userId,
        status: ShowtimeSeatStatus.HOLDING,
        holdExpiresAt: MoreThan(now),
      },
      order: { createdAt: 'DESC' },
    });
  }

  findExpiredHolds(now: Date): Promise<ShowtimeSeat[]> {
    return this.repo.find({
      where: {
        status: ShowtimeSeatStatus.HOLDING,
        holdExpiresAt: LessThan(now),
      },
    });
  }

  async saveHolds(
    showtimeId: string,
    seatIds: string[],
    userId: string,
    expiresAt: Date,
  ): Promise<void> {
    const existing = await this.repo.find({
      where: { showtimeId, seatId: In(seatIds) },
    });
    const existingBySeatId = new Map(existing.map((row) => [row.seatId, row]));

    const rows = seatIds.map((seatId) => {
      const row =
        existingBySeatId.get(seatId) ??
        this.repo.create({ showtimeId, seatId });
      row.status = ShowtimeSeatStatus.HOLDING;
      row.userId = userId;
      row.holdExpiresAt = expiresAt;
      return row;
    });

    await this.repo.save(rows);
  }

  async releaseHolds(
    showtimeId: string,
    seatIds: string[],
    userId: string,
  ): Promise<number> {
    const result = await this.repo
      .createQueryBuilder()
      .update(ShowtimeSeat)
      .set({
        status: ShowtimeSeatStatus.AVAILABLE,
        userId: null,
        holdExpiresAt: null,
      })
      .where('showtimeId = :showtimeId', { showtimeId })
      .andWhere('seatId IN (:...seatIds)', { seatIds })
      .andWhere('userId = :userId', { userId })
      .andWhere('status = :status', { status: ShowtimeSeatStatus.HOLDING })
      .execute();
    return result.affected ?? 0;
  }

  async markBooked(showtimeId: string, seatIds: string[]): Promise<number> {
    const result = await this.repo
      .createQueryBuilder()
      .update(ShowtimeSeat)
      .set({ status: ShowtimeSeatStatus.BOOKED, holdExpiresAt: null })
      .where('showtimeId = :showtimeId', { showtimeId })
      .andWhere('seatId IN (:...seatIds)', { seatIds })
      .andWhere('status = :holdingStatus', {
        holdingStatus: ShowtimeSeatStatus.HOLDING,
      })
      .execute();
    return result.affected ?? 0;
  }

  async releaseForOrder(
    showtimeId: string,
    seatIds: string[],
    userId?: string,
  ): Promise<void> {
    const qb = this.repo
      .createQueryBuilder()
      .update(ShowtimeSeat)
      .set({
        status: ShowtimeSeatStatus.AVAILABLE,
        userId: null,
        holdExpiresAt: null,
      })
      .where('showtimeId = :showtimeId', { showtimeId })
      .andWhere('seatId IN (:...seatIds)', { seatIds });

    if (userId) {
      qb.andWhere(
        '(status = :bookedStatus OR (status = :holdingStatus AND userId = :ownerUserId))',
        {
          bookedStatus: ShowtimeSeatStatus.BOOKED,
          holdingStatus: ShowtimeSeatStatus.HOLDING,
          ownerUserId: userId,
        },
      );
    } else {
      qb.andWhere('status IN (:...statuses)', {
        statuses: [ShowtimeSeatStatus.BOOKED, ShowtimeSeatStatus.HOLDING],
      });
    }

    await qb.execute();
  }

  async releaseExpiredHolds(now: Date): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(ShowtimeSeat)
      .set({
        status: ShowtimeSeatStatus.AVAILABLE,
        userId: null,
        holdExpiresAt: null,
      })
      .where('status = :status', { status: ShowtimeSeatStatus.HOLDING })
      .andWhere('holdExpiresAt IS NOT NULL')
      .andWhere('holdExpiresAt < :now', { now })
      .execute();
  }

  async releaseHoldsByShowtimes(showtimeIds: string[]): Promise<number> {
    if (showtimeIds.length === 0) return 0;

    const result = await this.repo
      .createQueryBuilder()
      .update(ShowtimeSeat)
      .set({
        status: ShowtimeSeatStatus.AVAILABLE,
        userId: null,
        holdExpiresAt: null,
      })
      .where('showtimeId IN (:...showtimeIds)', { showtimeIds })
      .andWhere('status = :status', { status: ShowtimeSeatStatus.HOLDING })
      .execute();
    return result.affected ?? 0;
  }
}
