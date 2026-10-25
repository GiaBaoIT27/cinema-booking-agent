import { Injectable, Inject, Logger } from '@nestjs/common';

import { generateTicketCode } from '../../domain/rules/booking-rules.js';

import { SEAT_INVENTORY } from '../ports/seat-inventory.port.js';
import type { ISeatInventory } from '../ports/seat-inventory.port.js';
import { SHOWTIME_LOOKUP } from '../ports/showtime-lookup.port.js';
import type { IShowtimeLookup } from '../ports/showtime-lookup.port.js';
import { SEAT_CATALOG } from '../ports/seat-catalog.port.js';
import type { ISeatCatalog } from '../ports/seat-catalog.port.js';
import { SEAT_HOLD_STORE } from '../ports/seat-hold-store.port.js';
import type { ISeatHoldStore } from '../ports/seat-hold-store.port.js';

import type {
  ValidateHoldingSeatsInput,
  ValidateHoldingSeatsResult,
  ReleaseSeatsForOrderInput,
} from '../dto/seat-reservation.dto.js';

/**
 * Các use-case nội bộ cho module orders/payments (không expose qua HTTP;
 * truy cập từ bên ngoài thông qua BookingsFacade).
 */
@Injectable()
export class SeatReservationsService {
  private readonly logger = new Logger(SeatReservationsService.name);

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

  /** Kiểm tra ghế đang HOLDING còn hạn của user và tính giá snapshot + mã vé. */
  async validateHoldingSeats(
    input: ValidateHoldingSeatsInput,
  ): Promise<ValidateHoldingSeatsResult> {
    const { userId, showtimeId, seatIds } = input;
    const invalid = (): ValidateHoldingSeatsResult => ({
      isValid: false,
      subtotalTickets: 0,
      seats: [],
    });

    const holds = await this.seatInventory.findActiveHolds(
      showtimeId,
      seatIds,
      userId,
      new Date(),
    );
    if (holds.length !== seatIds.length) return invalid();

    const seats = await this.seatCatalog.findByIds(seatIds);
    const seatTypeBySeatId = new Map(
      seats.map((seat) => [seat.id, seat.seatTypeId]),
    );

    const prices = await this.showtimeLookup.getSeatPrices(showtimeId);
    const priceBySeatType = new Map(
      prices.map((price) => [price.seatTypeId, price.finalPrice]),
    );

    for (const seatTypeId of new Set(seatTypeBySeatId.values())) {
      if (!priceBySeatType.has(seatTypeId)) {
        this.logger.warn(
          `[validateHoldingSeats] Không tìm thấy giá vé cho seatTypeId=${seatTypeId} showtimeId=${showtimeId}`,
        );
        return invalid();
      }
    }

    let subtotalTickets = 0;
    const result: ValidateHoldingSeatsResult['seats'] = [];

    for (const seatId of seatIds) {
      const seatTypeId = seatTypeBySeatId.get(seatId);
      if (!seatTypeId) return invalid();

      const price = priceBySeatType.get(seatTypeId) ?? 0;
      subtotalTickets += price;
      result.push({
        seatId,
        seatTypeId,
        price,
        ticketCode: generateTicketCode(),
      });
    }

    return { isValid: true, subtotalTickets, seats: result };
  }

  /**
   * HOLDING -> BOOKED (sau khi thanh toán thành công). Đồng thời dọn trạng thái giữ tạm thời,
   * nếu không GET /showtimes/:id/seats vẫn đọc thấy bản ghi HOLDING cũ cho ghế đã bán.
   * @returns Số ghế thực sự chuyển sang BOOKED.
   */
  async markSeatsAsBooked(
    showtimeId: string,
    seatIds: string[],
    userId?: string,
  ): Promise<number> {
    const affected = await this.seatInventory.markBooked(showtimeId, seatIds);

    if (affected === 0) {
      this.logger.warn(
        `[markSeatsAsBooked] Không có ghế nào chuyển sang BOOKED (showtime=${showtimeId}, seats=[${seatIds.join(', ')}]). ` +
          'Kiểm tra lại trạng thái HOLDING của các ghế trong bảng showtime_seats.',
      );
    }

    // Luôn dọn Redis để tự phục hồi cả khi DB đã lệch trạng thái
    await this.seatHoldStore.release(showtimeId, seatIds, userId);
    return affected;
  }

  /** Giải phóng ghế về AVAILABLE khi hủy / hết hạn đơn hàng (cả DB lẫn Redis). */
  async releaseSeatsForOrder(input: ReleaseSeatsForOrderInput): Promise<void> {
    const { showtimeId, seatIds, userId } = input;
    if (seatIds.length === 0) return;

    await this.seatInventory.releaseForOrder(showtimeId, seatIds, userId);
    await this.seatHoldStore.release(showtimeId, seatIds, userId);
  }

  /** Giải phóng các ghế HOLDING đã quá hạn (gọi bởi cron/job). Trả về số ghế đã dọn. */
  async cleanupExpiredHolds(): Promise<number> {
    const now = new Date();
    const expired = await this.seatInventory.findExpiredHolds(now);
    if (expired.length === 0) return 0;

    for (const hold of expired) {
      await this.seatHoldStore.release(
        hold.showtimeId,
        [hold.seatId],
        hold.userId ?? undefined,
      );
    }
    await this.seatInventory.releaseExpiredHolds(now);

    this.logger.log(
      `[Cleanup] Đã giải phóng ${expired.length} ghế hết hạn giữ`,
    );
    return expired.length;
  }
}
