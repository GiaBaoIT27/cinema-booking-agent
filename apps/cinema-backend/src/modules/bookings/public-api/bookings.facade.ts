import { Injectable } from '@nestjs/common';

import { SeatReservationsService } from '../application/services/seat-reservations.service.js';
import type {
  ValidateHoldingSeatsInputDto,
  ValidateHoldingSeatsResultDto,
} from './dto/validate-holding-seats.dto.js';
import type { ReleaseSeatsForOrderInputDto } from './dto/release-seats-for-order.dto.js';

/**
 * Cổng giao tiếp DUY NHẤT của module với bên ngoài (orders, payments...).
 * Giữ nguyên tên/chữ ký các hàm "internal API" của BookingService cũ.
 */
@Injectable()
export class BookingsFacade {
  constructor(
    private readonly seatReservationsService: SeatReservationsService,
  ) {}

  /** Kiểm tra ghế đang HOLDING của user và tính giá snapshot + mã vé (dùng khi tạo đơn). */
  validateHoldingSeats(
    input: ValidateHoldingSeatsInputDto,
  ): Promise<ValidateHoldingSeatsResultDto> {
    return this.seatReservationsService.validateHoldingSeats(input);
  }

  /** Chuyển ghế HOLDING -> BOOKED sau khi thanh toán. Trả về số ghế đã chuyển. */
  markSeatsAsBooked(
    showtimeId: string,
    seatIds: string[],
    userId?: string,
  ): Promise<number> {
    return this.seatReservationsService.markSeatsAsBooked(
      showtimeId,
      seatIds,
      userId,
    );
  }

  /** Giải phóng ghế khi hủy / hết hạn đơn hàng. */
  releaseSeatsForOrder(input: ReleaseSeatsForOrderInputDto): Promise<void> {
    return this.seatReservationsService.releaseSeatsForOrder(input);
  }

  /** Dọn các ghế HOLDING quá hạn (gọi bởi cron/job). Trả về số ghế đã dọn. */
  cleanupExpiredHolds(): Promise<number> {
    return this.seatReservationsService.cleanupExpiredHolds();
  }
}
