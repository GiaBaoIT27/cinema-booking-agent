import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ShowtimeSeatPrice } from '../../domain/entities/showtime-seat-price.entity.js';
import type { IShowtimeSeatPriceRepository } from '../../domain/repositories/showtime-seat-price.repository.interface.js';

/** Adapter TypeORM của module Showtimes – nơi DUY NHẤT được phép biết TypeORM. */
@Injectable()
export class TypeOrmShowtimeSeatPriceRepository
  implements IShowtimeSeatPriceRepository
{
  constructor(
    @InjectRepository(ShowtimeSeatPrice)
    private readonly repo: Repository<ShowtimeSeatPrice>,
  ) {}

  findByShowtimeId(showtimeId: string): Promise<ShowtimeSeatPrice[]> {
    return this.repo.find({ where: { showtimeId } });
  }

  /** Kèm quan hệ seatType (lấy tên/mã loại ghế cho bảng giá) */
  findByShowtimeIdWithSeatType(
    showtimeId: string,
  ): Promise<ShowtimeSeatPrice[]> {
    return this.repo
      .createQueryBuilder('ssp')
      .innerJoinAndSelect('ssp.seatType', 'st')
      .where('ssp.showtimeId = :showtimeId', { showtimeId })
      .orderBy('st.id', 'ASC')
      .getMany();
  }

  findOne(
    showtimeId: string,
    seatTypeId: string,
  ): Promise<ShowtimeSeatPrice | null> {
    return this.repo.findOne({ where: { showtimeId, seatTypeId } });
  }

  save(
    price: Partial<ShowtimeSeatPrice> | ShowtimeSeatPrice,
  ): Promise<ShowtimeSeatPrice> {
    return this.repo.save(price as ShowtimeSeatPrice);
  }
}
