import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

import { Showtime } from '../../domain/entities/showtime.entity.js';
import { ShowtimeStatus } from '../../domain/enums/showtime-status.enum.js';
import type {
  IShowtimeRepository,
  ShowtimeListFilter,
  PaginatedShowtimes,
  BookableShowtimeCriteria,
} from '../../domain/repositories/showtime.repository.interface.js';

/**
 * Adapter TypeORM của module Showtimes – nơi DUY NHẤT được phép biết TypeORM.
 * Service chỉ phụ thuộc IShowtimeRepository (domain port).
 */
@Injectable()
export class TypeOrmShowtimeRepository implements IShowtimeRepository {
  constructor(
    @InjectRepository(Showtime)
    private readonly repo: Repository<Showtime>,
  ) {}

  findById(id: string): Promise<Showtime | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByIds(ids: string[]): Promise<Showtime[]> {
    const uniqueIds = [...new Set(ids)];
    if (!uniqueIds.length) return [];
    return this.repo.find({ where: { id: In(uniqueIds) } });
  }

  /** Kèm movie + auditorium + cineplex (dùng cho chi tiết suất chiếu) */
  findByIdWithVenue(id: string): Promise<Showtime | null> {
    return this.repo
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.movie', 'm')
      .innerJoinAndSelect('s.auditorium', 'a')
      .innerJoinAndSelect('a.cineplex', 'c')
      .where('s.id = :id', { id })
      .getOne();
  }

  /**
   * Kèm toàn bộ ghế vật lý của phòng chiếu (kèm loại ghế)
   * và trạng thái ghế của suất chiếu – dùng cho sơ đồ ghế (seat matrix).
   */
  findByIdWithAuditoriumSeats(id: string): Promise<Showtime | null> {
    return this.repo
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.auditorium', 'a')
      .innerJoinAndSelect('a.seats', 'seat')
      .leftJoinAndSelect('seat.seatType', 'st')
      .leftJoinAndSelect('s.showtimeSeats', 'ss', 'ss.seatId = seat.id')
      .where('s.id = :id', { id })
      .orderBy('seat.rowLabel', 'ASC')
      .addOrderBy('seat.seatNumber', 'ASC')
      .getOne();
  }

  async findPaginated(filter: ShowtimeListFilter): Promise<PaginatedShowtimes> {
    const { movieId, cineplexId, date, projectionType, status, page, limit } =
      filter;

    const qb = this.repo
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.movie', 'm')
      .innerJoinAndSelect('s.auditorium', 'a')
      .innerJoinAndSelect('a.cineplex', 'c');

    if (movieId) {
      qb.andWhere('s.movieId = :movieId', { movieId });
    }
    if (cineplexId) {
      qb.andWhere('c.id = :cineplexId', { cineplexId });
    }
    if (projectionType) {
      qb.andWhere('s.projectionType = :projectionType', { projectionType });
    }
    if (status) {
      qb.andWhere('s.status = :status', { status });
    }

    // Lọc khoảng thời gian [00:00:00, 23:59:59.999] trong ngày để tận dụng Database Index
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);
    qb.andWhere('s.startTime >= :startOfDay AND s.startTime <= :endOfDay', {
      startOfDay,
      endOfDay,
    });

    qb.orderBy('s.startTime', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, totalItems] = await qb.getManyAndCount();
    return { data, totalItems };
  }

  /** Kiểm tra trùng lịch chiếu tại cùng phòng chiếu (loại trừ 1 suất nếu truyền excludeShowtimeId) */
  findOverlapping(
    auditoriumId: string,
    startTime: Date,
    endTime: Date,
    excludeShowtimeId?: string,
  ): Promise<Showtime | null> {
    const qb = this.repo
      .createQueryBuilder('s')
      .where('s.auditoriumId = :auditoriumId', { auditoriumId })
      .andWhere('s.status != :cancelledStatus', {
        cancelledStatus: ShowtimeStatus.CANCELLED,
      })
      .andWhere('s.startTime < :endTime', { endTime })
      .andWhere('s.endTime > :startTime', { startTime });

    if (excludeShowtimeId) {
      qb.andWhere('s.id != :excludeId', { excludeId: excludeShowtimeId });
    }

    return qb.getOne();
  }

  /**
   * GET /cineplexes/:id/showtimes — suất SCHEDULED/OPEN trong khoảng ngày,
   * kèm movie (cho group theo phim) + auditorium/cineplex (cho response).
   */
  findByCineplexAndRange(
    cineplexId: string,
    from: Date,
    to: Date,
    movieId?: string,
  ): Promise<Showtime[]> {
    const qb = this.repo
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.movie', 'm')
      .innerJoinAndSelect('s.auditorium', 'a')
      .where('a.cineplexId = :cineplexId', { cineplexId })
      .andWhere('s.status IN (:...statuses)', {
        statuses: [ShowtimeStatus.SCHEDULED, ShowtimeStatus.OPEN],
      })
      .andWhere('s.startTime >= :from AND s.startTime <= :to', { from, to })
      .orderBy('m.id', 'ASC')
      .addOrderBy('s.startTime', 'ASC');

    if (movieId) {
      qb.andWhere('s.movieId = :movieId', { movieId });
    }

    return qb.getMany();
  }

  /** GET /movies/:id/showtimes — suất SCHEDULED/OPEN chưa tới giờ, kèm venue. */
  findBookableByMovie(
    movieId: string,
    criteria: BookableShowtimeCriteria,
  ): Promise<Showtime[]> {
    const { cineplexId, from, to, now } = criteria;

    const qb = this.repo
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.auditorium', 'a')
      .innerJoinAndSelect('a.cineplex', 'c')
      .where('s.movieId = :movieId', { movieId })
      .andWhere('s.status IN (:...statuses)', {
        statuses: [ShowtimeStatus.SCHEDULED, ShowtimeStatus.OPEN],
      })
      .andWhere('s.startTime > :now', { now })
      .andWhere('s.startTime >= :from AND s.startTime <= :to', { from, to })
      .orderBy('c.id', 'ASC')
      .addOrderBy('s.startTime', 'ASC');

    if (cineplexId) {
      qb.andWhere('c.id = :cineplexId', { cineplexId });
    }

    return qb.getMany();
  }

  /**
   * Bulk UPDATE → CANCELLED các suất chưa chiếu của các phòng cho trước.
   * Tôn trọng transitions: chỉ nhận statuses mà rules cho phép → CANCELLED.
   */
  async cancelUpcomingByAuditoriums(
    auditoriumIds: string[],
    statuses: ShowtimeStatus[],
  ): Promise<string[]> {
    if (auditoriumIds.length === 0 || statuses.length === 0) return [];

    const result = await this.repo
      .createQueryBuilder()
      .update(Showtime)
      .set({
        status: ShowtimeStatus.CANCELLED,
        updatedAt: new Date(),
      })
      .where('auditorium_id IN (:...auditoriumIds)', { auditoriumIds })
      .andWhere('start_time > CURRENT_TIMESTAMP')
      .andWhere('status IN (:...statuses)', { statuses })
      .returning('id')
      .execute();

    const rows = result.raw as Array<{ id: string | number }>;
    return rows.map((row) => String(row.id));
  }

  save(showtime: Partial<Showtime> | Showtime): Promise<Showtime> {
    return this.repo.save(showtime as Showtime);
  }

  async exists(id: string): Promise<boolean> {
    return (await this.repo.count({ where: { id } })) > 0;
  }
}
