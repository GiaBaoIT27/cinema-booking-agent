import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, IsNull, LessThan, MoreThan, Repository } from 'typeorm';

import { ShowtimeSeat } from '../../domain/entities/showtime-seat.entity.js';
import { ShowtimeSeatStatus } from '../../domain/enums/showtime-seat-status.js';
import type { IShowtimeSeatRepository } from '../../domain/repositories/showtime-seat.repository.interface.js';

/** Ném trong transaction để rollback thao tác all-or-nothing không trọn vẹn. */
class PartialSeatUpdateError extends Error {}

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
        orderCode: IsNull(),
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

  /**
   * Upsert có điều kiện trong một câu lệnh: nhờ khóa chính (showtime_id, seat_id),
   * hai request tranh cùng một ghế được Postgres tuần tự hóa – chỉ một bên nhận được dòng.
   */
  async tryHold(
    showtimeId: string,
    seatIds: string[],
    userId: string,
    expiresAt: Date,
    now: Date,
  ): Promise<boolean> {
    if (seatIds.length === 0) return true;

    return this.allOrNothing(async (manager) => {
      const rows: unknown[] = await manager.query(
        // ORDER BY seat_id: mọi transaction khóa dòng theo CÙNG một thứ tự => tránh deadlock
        // khi nhiều người giữ các bộ ghế chồng lấn nhau (A giữ [1,2], B giữ [2,1]).
        `INSERT INTO showtime_seats (showtime_id, seat_id, status, user_id, hold_expires_at, order_code)
         SELECT $1, seat_id, $3, $4, $5, NULL FROM unnest($2::bigint[]) AS seat_id
         ORDER BY seat_id
         ON CONFLICT (showtime_id, seat_id) DO UPDATE
           SET status = EXCLUDED.status,
               user_id = EXCLUDED.user_id,
               hold_expires_at = EXCLUDED.hold_expires_at,
               order_code = NULL,
               updated_at = now()
           WHERE showtime_seats.status = $6
              OR (showtime_seats.status = $3
                  AND showtime_seats.order_code IS NULL
                  AND (showtime_seats.user_id = EXCLUDED.user_id
                       OR showtime_seats.hold_expires_at IS NULL
                       OR showtime_seats.hold_expires_at <= $7))
         RETURNING seat_id`,
        [
          showtimeId,
          seatIds,
          ShowtimeSeatStatus.HOLDING,
          userId,
          expiresAt,
          ShowtimeSeatStatus.AVAILABLE,
          now,
        ],
      );
      return rows.length === seatIds.length;
    });
  }

  async claimForOrder(
    showtimeId: string,
    seatIds: string[],
    userId: string,
    orderCode: string,
    holdUntil: Date,
    now: Date,
  ): Promise<boolean> {
    if (seatIds.length === 0) return false;

    return this.allOrNothing(async (manager) => {
      await this.lockRowsInOrder(manager, showtimeId, seatIds);
      const result = await manager
        .createQueryBuilder()
        .update(ShowtimeSeat)
        .set({ orderCode, holdExpiresAt: holdUntil })
        .where('showtimeId = :showtimeId', { showtimeId })
        .andWhere('seatId IN (:...seatIds)', { seatIds })
        .andWhere('userId = :userId', { userId })
        .andWhere('status = :status', { status: ShowtimeSeatStatus.HOLDING })
        .andWhere('orderCode IS NULL')
        .andWhere('holdExpiresAt > :now', { now })
        .execute();
      return (result.affected ?? 0) === seatIds.length;
    });
  }

  async unclaimForOrder(
    showtimeId: string,
    seatIds: string[],
    orderCode: string,
  ): Promise<void> {
    if (seatIds.length === 0) return;

    await this.repo
      .createQueryBuilder()
      .update(ShowtimeSeat)
      .set({ orderCode: null })
      .where('showtimeId = :showtimeId', { showtimeId })
      .andWhere('seatId IN (:...seatIds)', { seatIds })
      .andWhere('orderCode = :orderCode', { orderCode })
      .andWhere('status = :status', { status: ShowtimeSeatStatus.HOLDING })
      .execute();
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
        orderCode: null,
      })
      .where('showtimeId = :showtimeId', { showtimeId })
      .andWhere('seatId IN (:...seatIds)', { seatIds })
      .andWhere('userId = :userId', { userId })
      .andWhere('status = :status', { status: ShowtimeSeatStatus.HOLDING })
      // Ghế đã gắn đơn PENDING chỉ được nhả qua việc hủy đơn
      .andWhere('orderCode IS NULL')
      .execute();
    return result.affected ?? 0;
  }

  async markBooked(
    showtimeId: string,
    seatIds: string[],
    orderCode: string,
  ): Promise<boolean> {
    if (seatIds.length === 0) return false;

    return this.allOrNothing(async (manager) => {
      await this.lockRowsInOrder(manager, showtimeId, seatIds);
      const result = await manager
        .createQueryBuilder()
        .update(ShowtimeSeat)
        .set({ status: ShowtimeSeatStatus.BOOKED, holdExpiresAt: null })
        .where('showtimeId = :showtimeId', { showtimeId })
        .andWhere('seatId IN (:...seatIds)', { seatIds })
        .andWhere('orderCode = :orderCode', { orderCode })
        .andWhere('status = :holdingStatus', {
          holdingStatus: ShowtimeSeatStatus.HOLDING,
        })
        .execute();
      return (result.affected ?? 0) === seatIds.length;
    });
  }

  async isBookedForOrder(
    showtimeId: string,
    seatIds: string[],
    orderCode: string,
  ): Promise<boolean> {
    if (seatIds.length === 0) return false;
    const count = await this.repo.count({
      where: {
        showtimeId,
        seatId: In(seatIds),
        orderCode,
        status: ShowtimeSeatStatus.BOOKED,
      },
    });
    return count === seatIds.length;
  }

  async revertBooked(
    showtimeId: string,
    seatIds: string[],
    orderCode: string,
  ): Promise<void> {
    if (seatIds.length === 0) return;

    await this.repo
      .createQueryBuilder()
      .update(ShowtimeSeat)
      .set({ status: ShowtimeSeatStatus.HOLDING })
      .where('showtimeId = :showtimeId', { showtimeId })
      .andWhere('seatId IN (:...seatIds)', { seatIds })
      .andWhere('orderCode = :orderCode', { orderCode })
      .andWhere('status = :status', { status: ShowtimeSeatStatus.BOOKED })
      .execute();
  }

  async releaseForOrder(
    showtimeId: string,
    seatIds: string[],
    orderCode: string,
    userId?: string,
  ): Promise<void> {
    if (seatIds.length === 0) return;

    const qb = this.repo
      .createQueryBuilder()
      .update(ShowtimeSeat)
      .set({
        status: ShowtimeSeatStatus.AVAILABLE,
        userId: null,
        holdExpiresAt: null,
        orderCode: null,
      })
      .where('showtimeId = :showtimeId', { showtimeId })
      .andWhere('seatId IN (:...seatIds)', { seatIds })
      .andWhere('status = :holdingStatus', {
        holdingStatus: ShowtimeSeatStatus.HOLDING,
      });

    if (userId) {
      // Dữ liệu cũ (trước khi có order_code): HOLDING chưa gắn đơn của chính user
      qb.andWhere(
        '(orderCode = :orderCode OR (orderCode IS NULL AND userId = :ownerUserId))',
        { orderCode, ownerUserId: userId },
      );
    } else {
      qb.andWhere('orderCode = :orderCode', { orderCode });
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
        orderCode: null,
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
        orderCode: null,
      })
      .where('showtimeId IN (:...showtimeIds)', { showtimeIds })
      .andWhere('status = :status', { status: ShowtimeSeatStatus.HOLDING })
      .execute();
    return result.affected ?? 0;
  }

  /** Khóa các dòng ghế theo thứ tự seat_id cố định (tránh deadlock giữa các transaction). */
  private async lockRowsInOrder(
    manager: EntityManager,
    showtimeId: string,
    seatIds: string[],
  ): Promise<void> {
    await manager.query(
      `SELECT 1 FROM showtime_seats
       WHERE showtime_id = $1 AND seat_id = ANY($2::bigint[])
       ORDER BY seat_id
       FOR UPDATE`,
      [showtimeId, seatIds],
    );
  }

  /**
   * Chạy `work` trong transaction; `work` trả false => rollback toàn bộ và trả false.
   * Đảm bảo không bao giờ có trạng thái "chốt được một nửa số ghế".
   */
  private async allOrNothing(
    work: (manager: EntityManager) => Promise<boolean>,
  ): Promise<boolean> {
    try {
      await this.repo.manager.transaction(async (manager) => {
        if (!(await work(manager))) throw new PartialSeatUpdateError();
      });
      return true;
    } catch (error) {
      if (error instanceof PartialSeatUpdateError) return false;
      throw error;
    }
  }
}
