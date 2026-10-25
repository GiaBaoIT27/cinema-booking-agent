import { Injectable, Inject } from '@nestjs/common';

import {
  SEAT_HOLD_DURATION_MS,
  isSeatSellable,
  isShowtimeHoldable,
} from '../../domain/rules/booking-rules.js';

import { SEAT_INVENTORY } from '../ports/seat-inventory.port.js';
import type { ISeatInventory } from '../ports/seat-inventory.port.js';
import { SHOWTIME_LOOKUP } from '../ports/showtime-lookup.port.js';
import type { IShowtimeLookup } from '../ports/showtime-lookup.port.js';
import { SEAT_CATALOG } from '../ports/seat-catalog.port.js';
import type { ISeatCatalog } from '../ports/seat-catalog.port.js';
import { SEAT_HOLD_STORE } from '../ports/seat-hold-store.port.js';
import type { ISeatHoldStore } from '../ports/seat-hold-store.port.js';

import { HoldSeatsDto } from '../dto/hold-seats.dto.js';
import { ReleaseSeatsDto } from '../dto/release-seats.dto.js';
import {
  toHoldSeatsResponse,
  toReleaseSeatsResponse,
  toMyHoldsResponse,
} from '../mappers/booking.mapper.js';

import { BusinessException } from '#src/common/exceptions/business.exception.js';
import { ErrorCode } from '#src/common/constants/error-codes.enum.js';

/** Các use-case dành cho khách hàng (HTTP): giữ ghế, trả ghế, xem ghế đang giữ. */
@Injectable()
export class BookingsService {
  constructor(
    @Inject(SEAT_INVENTORY)
    private readonly seatInventory: ISeatInventory,
    @Inject(SHOWTIME_LOOKUP)
    private readonly showtimeLookup: IShowtimeLookup,
    @Inject(SEAT_CATALOG)
    private readonly seatCatalog: ISeatCatalog,
    @Inject(SEAT_HOLD_STORE)
    private readonly seatHoldStore: ISeatHoldStore,
  ) {}

  /**
   * POST /api/v1/bookings/hold
   *  1. Suất chiếu tồn tại & cho phép giữ ghế
   *  2. Ghế hợp lệ: thuộc phòng chiếu của suất, đang ACTIVE
   *  3. Ghế chưa BOOKED trong DB
   *  4. Khóa + ghi trạng thái giữ (Redis), all-or-nothing
   *  5. Ghi HOLDING vào DB; nếu lỗi thì hoàn trả khóa Redis
   */
  async holdSeats(userId: string, dto: HoldSeatsDto) {
    const showtimeId = String(dto.showtimeId);
    const seatIds = [...new Set(dto.seatIds.map(String))];

    // 1. Suất chiếu
    const showtime = await this.showtimeLookup.findById(showtimeId);
    if (!showtime) {
      throw new BusinessException(
        ErrorCode.SHOWTIME_NOT_FOUND,
        `Suất chiếu với ID ${dto.showtimeId} không tồn tại`,
      );
    }
    if (!isShowtimeHoldable(showtime.status)) {
      throw new BusinessException(
        ErrorCode.SHOWTIME_NOT_OPEN,
        'Suất chiếu chưa mở bán hoặc đã đóng, không thể giữ ghế',
      );
    }

    // 2. Ghế
    const seats = (await this.seatCatalog.findByIds(seatIds)).filter(
      (seat) => seat.auditoriumId === showtime.auditoriumId,
    );
    if (seats.length !== seatIds.length) {
      const foundIds = new Set(seats.map((seat) => seat.id));
      const invalidIds = seatIds.filter((id) => !foundIds.has(id));
      throw new BusinessException(
        ErrorCode.INVALID_SEAT_IDS,
        `Ghế không hợp lệ hoặc không thuộc phòng chiếu: [${invalidIds.join(', ')}]`,
      );
    }

    const unsellable = seats.filter((seat) => !isSeatSellable(seat.status));
    if (unsellable.length > 0) {
      throw new BusinessException(
        ErrorCode.SEATS_NOT_AVAILABLE,
        `Ghế [${unsellable.map((seat) => seat.seatNumber).join(', ')}] đang bảo trì hoặc vô hiệu hóa`,
      );
    }

    // 3. Ghế đã bán dứt điểm
    const bookedSeatIds = await this.seatInventory.findBookedSeatIds(
      showtimeId,
      seatIds,
    );
    if (bookedSeatIds.length > 0) {
      throw new BusinessException(
        ErrorCode.SHOWTIME_SEAT_ALREADY_BOOKED,
        `Ghế [${bookedSeatIds.join(', ')}] đã được đặt`,
      );
    }

    // 4. Khóa + ghi trạng thái giữ (realtime)
    const holdExpiresAt = await this.seatHoldStore.acquire(
      showtimeId,
      seatIds,
      userId,
      SEAT_HOLD_DURATION_MS,
    );
    if (!holdExpiresAt) {
      throw new BusinessException(
        ErrorCode.SHOWTIME_SEATS_BEING_HELD,
        'Một hoặc nhiều ghế đang được người khác giữ, vui lòng chọn ghế khác',
      );
    }

    // 5. Ghi DB (bản sao bền vững). Lỗi => hoàn trả khóa để không treo ghế tới khi hết TTL.
    try {
      await this.seatInventory.saveHolds(
        showtimeId,
        seatIds,
        userId,
        holdExpiresAt,
      );
    } catch (error) {
      await this.seatHoldStore.release(showtimeId, seatIds, userId);
      throw error;
    }

    return toHoldSeatsResponse(dto.showtimeId, seats, holdExpiresAt);
  }

  /**
   * POST /api/v1/bookings/release
   * Chỉ trả ghế đang HOLDING còn hạn của chính user; ghế đã BOOKED phải hủy qua đơn hàng.
   */
  async releaseSeats(userId: string, dto: ReleaseSeatsDto) {
    const showtimeId = String(dto.showtimeId);
    const seatIds = [...new Set(dto.seatIds.map(String))];

    const holds = await this.seatInventory.findActiveHolds(
      showtimeId,
      seatIds,
      userId,
      new Date(),
    );
    const releasableSeatIds = holds.map((hold) => hold.seatId);

    if (releasableSeatIds.length > 0) {
      await this.seatHoldStore.release(showtimeId, releasableSeatIds, userId);
      await this.seatInventory.releaseHolds(
        showtimeId,
        releasableSeatIds,
        userId,
      );
    }

    return toReleaseSeatsResponse(dto.showtimeId, releasableSeatIds);
  }

  /** GET /api/v1/bookings/my-holds */
  async getMyHolds(userId: string) {
    const holds = await this.seatInventory.findActiveHoldsByUser(
      userId,
      new Date(),
    );

    const seatIds = [...new Set(holds.map((hold) => hold.seatId))];
    const seats = seatIds.length
      ? await this.seatCatalog.findByIds(seatIds)
      : [];

    return toMyHoldsResponse(
      holds,
      new Map(seats.map((seat) => [seat.id, seat])),
    );
  }
}
