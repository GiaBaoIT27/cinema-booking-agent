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
  ReserveSeatsForOrderInput,
  OrderSeatsInput,
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
   * Gắn các ghế user đang giữ vào đơn `orderCode` và gia hạn giữ tới `holdUntil`
   * (all-or-nothing). Sau bước này ghế không thể bị giữ lại hay dùng cho đơn khác,
   * kể cả khi khóa Redis hết hạn.
   * @returns false nếu có ghế không còn được user giữ / đã gắn đơn khác.
   */
  async reserveSeatsForOrder(
    input: ReserveSeatsForOrderInput,
  ): Promise<boolean> {
    const { showtimeId, seatIds, userId, orderCode, holdUntil } = input;
    const now = new Date();

    const claimed = await this.seatInventory.claimForOrder(
      showtimeId,
      seatIds,
      userId,
      orderCode,
      holdUntil,
      now,
    );
    if (!claimed) return false;

    // Khóa Redis chỉ để chặn nhanh; lỗi Redis không làm hỏng đơn vì DB đã giữ ghế
    try {
      await this.seatHoldStore.extend(
        showtimeId,
        seatIds,
        userId,
        Math.max(holdUntil.getTime() - now.getTime(), 1),
      );
    } catch (error) {
      this.logger.warn(
        `[reserveSeatsForOrder] Không gia hạn được khóa Redis cho đơn ${orderCode}: ${String(error)}`,
      );
    }
    return true;
  }

  /** Bù trừ khi tạo đơn thất bại sau khi đã gắn ghế: gỡ gắn đơn, ghế vẫn do user giữ. */
  async cancelSeatReservationForOrder(input: OrderSeatsInput): Promise<void> {
    const { showtimeId, seatIds, orderCode } = input;
    await this.seatInventory.unclaimForOrder(showtimeId, seatIds, orderCode);
  }

  /**
   * HOLDING -> BOOKED cho các ghế của đúng đơn `orderCode` (all-or-nothing), sau khi
   * thanh toán thành công. Dọn trạng thái giữ tạm thời trên Redis khi thành công.
   * @returns false nếu không chốt được TOÀN BỘ ghế (không ghế nào bị thay đổi).
   */
  async markSeatsAsBooked(input: OrderSeatsInput): Promise<boolean> {
    const { showtimeId, seatIds, orderCode, userId } = input;
    const booked = await this.seatInventory.markBooked(
      showtimeId,
      seatIds,
      orderCode,
    );

    if (!booked) {
      this.logger.warn(
        `[markSeatsAsBooked] Không chốt được ghế cho đơn ${orderCode} (showtime=${showtimeId}, seats=[${seatIds.join(', ')}]): ` +
          'ghế không còn được giữ cho đơn này.',
      );
      return false;
    }

    await this.seatHoldStore.release(showtimeId, seatIds, userId);
    return true;
  }

  /** Toàn bộ ghế của đơn đã được chốt (BOOKED) cho chính đơn đó? */
  isBookedForOrder(input: OrderSeatsInput): Promise<boolean> {
    const { showtimeId, seatIds, orderCode } = input;
    return this.seatInventory.isBookedForOrder(showtimeId, seatIds, orderCode);
  }

  /** BOOKED -> HOLDING cho ghế của đơn `orderCode` (bù trừ khi ghi đơn/vé thất bại). */
  async revertSeatsBooked(input: OrderSeatsInput): Promise<void> {
    const { showtimeId, seatIds, orderCode } = input;
    await this.seatInventory.revertBooked(showtimeId, seatIds, orderCode);
  }

  /**
   * Giải phóng ghế HOLDING của đơn về AVAILABLE khi hủy / hết hạn đơn hàng (cả DB lẫn Redis).
   * Không bao giờ nhả ghế đã BOOKED.
   */
  async releaseSeatsForOrder(input: ReleaseSeatsForOrderInput): Promise<void> {
    const { showtimeId, seatIds, orderCode, userId } = input;
    if (seatIds.length === 0) return;

    await this.seatInventory.releaseForOrder(
      showtimeId,
      seatIds,
      orderCode,
      userId,
    );
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
