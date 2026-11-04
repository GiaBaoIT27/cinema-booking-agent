import { Injectable } from '@nestjs/common';

import { SeatReservationsService } from '../application/services/seat-reservations.service.js';
import type {
  ValidateHoldingSeatsInputDto,
  ValidateHoldingSeatsResultDto,
} from './dto/validate-holding-seats.dto.js';
import type {
  OrderSeatsInputDto,
  ReleaseSeatsForOrderInputDto,
  ReserveSeatsForOrderInputDto,
} from './dto/release-seats-for-order.dto.js';

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

  /** Gắn ghế user đang giữ vào đơn + gia hạn giữ (all-or-nothing). */
  reserveSeatsForOrder(input: ReserveSeatsForOrderInputDto): Promise<boolean> {
    return this.seatReservationsService.reserveSeatsForOrder(input);
  }

  /** Gỡ gắn đơn khỏi ghế (bù trừ khi tạo đơn thất bại). */
  cancelSeatReservationForOrder(input: OrderSeatsInputDto): Promise<void> {
    return this.seatReservationsService.cancelSeatReservationForOrder(input);
  }

  /** Chuyển ghế của đơn HOLDING -> BOOKED sau khi thanh toán (all-or-nothing). */
  markSeatsAsBooked(input: OrderSeatsInputDto): Promise<boolean> {
    return this.seatReservationsService.markSeatsAsBooked(input);
  }

  /** Toàn bộ ghế của đơn đã được chốt cho chính đơn đó? */
  isSeatsBookedForOrder(input: OrderSeatsInputDto): Promise<boolean> {
    return this.seatReservationsService.isBookedForOrder(input);
  }

  /** BOOKED -> HOLDING cho ghế của đơn (bù trừ khi ghi đơn/vé thất bại). */
  revertSeatsBooked(input: OrderSeatsInputDto): Promise<void> {
    return this.seatReservationsService.revertSeatsBooked(input);
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
