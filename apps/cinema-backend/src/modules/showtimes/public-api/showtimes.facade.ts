import { Inject, Injectable } from '@nestjs/common';

import {
  SHOWTIME_REPOSITORY,
  type IShowtimeRepository,
} from '../domain/repositories/showtime.repository.interface.js';
import {
  SHOWTIME_SEAT_PRICE_REPOSITORY,
  type IShowtimeSeatPriceRepository,
} from '../domain/repositories/showtime-seat-price.repository.interface.js';
import {
  SHOWTIME_SEAT_REPOSITORY,
  type IShowtimeSeatRepository,
} from '../domain/repositories/showtime-seat.repository.interface.js';

import { ShowtimeStatus } from '../domain/enums/showtime-status.enum.js';
import {
  toShowtimeSummary,
  toSeatPriceSummary,
} from '../application/mappers/showtime.mapper.js';
import { toSeatHoldSummary } from '../application/mappers/showtime-seat.mapper.js';
import type { ShowtimeSummaryDto } from './dto/showtime-summary.dto.js';
import type { SeatHoldSummaryDto } from './dto/seat-hold.dto.js';
import type { SeatPriceSummaryDto } from './dto/seat-price.dto.js';

/**
 * Cổng giao tiếp DUY NHẤT của module Showtimes với bên ngoài.
 * Chỉ trả về các *SummaryDto – tuyệt đối không để lộ entity.
 * Mọi hàm trả null/boolean, không ném HTTP exception.
 */
@Injectable()
export class ShowtimesFacade {
  constructor(
    @Inject(SHOWTIME_REPOSITORY)
    private readonly showtimeRepository: IShowtimeRepository,
    @Inject(SHOWTIME_SEAT_PRICE_REPOSITORY)
    private readonly seatPriceRepository: IShowtimeSeatPriceRepository,
    @Inject(SHOWTIME_SEAT_REPOSITORY)
    private readonly showtimeSeatRepository: IShowtimeSeatRepository,
  ) {}

  /** Suất chiếu còn có thể đặt vé (OPEN và chưa tới giờ chiếu) hay không */
  async assertBookable(showtimeId: string | number): Promise<boolean> {
    const showtime = await this.showtimeRepository.findById(
      showtimeId.toString(),
    );
    if (!showtime) return false;
    return (
      showtime.status === ShowtimeStatus.OPEN &&
      new Date(showtime.startTime) > new Date()
    );
  }

  async getShowtimeDetail(
    showtimeId: string | number,
  ): Promise<ShowtimeSummaryDto | null> {
    const showtime = await this.showtimeRepository.findById(
      showtimeId.toString(),
    );
    return showtime ? toShowtimeSummary(showtime) : null;
  }

  async getShowtimesByIds(ids: string[]): Promise<ShowtimeSummaryDto[]> {
    const showtimes = await this.showtimeRepository.findByIds(ids);
    return showtimes.map(toShowtimeSummary);
  }

  /** Bảng giá ghế hiện tại của suất chiếu (kèm tên/mã loại ghế) */
  async getSeatPricesForShowtime(
    showtimeId: string | number,
  ): Promise<SeatPriceSummaryDto[]> {
    const prices = await this.seatPriceRepository.findByShowtimeIdWithSeatType(
      showtimeId.toString(),
    );
    return prices.map(toSeatPriceSummary);
  }

  /** Giá vé cuối cùng của 1 loại ghế trong suất chiếu (null nếu chưa sinh bảng giá) */
  async calculateSeatPrice(
    showtimeId: string | number,
    seatTypeId: string | number,
  ): Promise<number | null> {
    const price = await this.seatPriceRepository.findOne(
      showtimeId.toString(),
      seatTypeId.toString(),
    );
    return price ? Number(price.finalPrice) : null;
  }

  // ───────── Trạng thái giữ / bán ghế (dành cho module bookings) ─────────

  findBookedSeatIds(showtimeId: string, seatIds: string[]): Promise<string[]> {
    return this.showtimeSeatRepository.findBookedSeatIds(showtimeId, seatIds);
  }

  /** Ghế đang HOLDING còn hạn của đúng `userId` */
  async findActiveSeatHolds(
    showtimeId: string,
    seatIds: string[],
    userId: string,
    now: Date,
  ): Promise<SeatHoldSummaryDto[]> {
    const holds = await this.showtimeSeatRepository.findActiveHolds(
      showtimeId,
      seatIds,
      userId,
      now,
    );
    return holds.map(toSeatHoldSummary);
  }

  /** Mọi ghế HOLDING còn hạn của user (mọi suất chiếu) */
  async findActiveSeatHoldsByUser(
    userId: string,
    now: Date,
  ): Promise<SeatHoldSummaryDto[]> {
    const holds = await this.showtimeSeatRepository.findActiveHoldsByUser(
      userId,
      now,
    );
    return holds.map(toSeatHoldSummary);
  }

  /** Ghế HOLDING đã quá hạn */
  async findExpiredSeatHolds(now: Date): Promise<SeatHoldSummaryDto[]> {
    const holds = await this.showtimeSeatRepository.findExpiredHolds(now);
    return holds.map(toSeatHoldSummary);
  }

  saveSeatHolds(
    showtimeId: string,
    seatIds: string[],
    userId: string,
    expiresAt: Date,
  ): Promise<void> {
    return this.showtimeSeatRepository.saveHolds(
      showtimeId,
      seatIds,
      userId,
      expiresAt,
    );
  }

  /** HOLDING của `userId` → AVAILABLE. Trả về số ghế được nhả */
  releaseSeatHolds(
    showtimeId: string,
    seatIds: string[],
    userId: string,
  ): Promise<number> {
    return this.showtimeSeatRepository.releaseHolds(
      showtimeId,
      seatIds,
      userId,
    );
  }

  /** HOLDING → BOOKED. Trả về số ghế được chốt */
  markSeatsBooked(showtimeId: string, seatIds: string[]): Promise<number> {
    return this.showtimeSeatRepository.markBooked(showtimeId, seatIds);
  }

  /** BOOKED (hoặc HOLDING của `userId`) → AVAILABLE khi hủy/hết hạn đơn hàng */
  releaseSeatsForOrder(
    showtimeId: string,
    seatIds: string[],
    userId?: string,
  ): Promise<void> {
    return this.showtimeSeatRepository.releaseForOrder(
      showtimeId,
      seatIds,
      userId,
    );
  }

  releaseExpiredSeatHolds(now: Date): Promise<void> {
    return this.showtimeSeatRepository.releaseExpiredHolds(now);
  }

  /** Mọi ghế HOLDING của các suất chiếu → AVAILABLE (khi suất chiếu bị hủy) */
  releaseSeatHoldsForShowtimes(showtimeIds: string[]): Promise<number> {
    return this.showtimeSeatRepository.releaseHoldsByShowtimes(showtimeIds);
  }
}
