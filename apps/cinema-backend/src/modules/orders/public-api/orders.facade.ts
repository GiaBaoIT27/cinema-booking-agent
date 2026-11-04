import { Injectable } from '@nestjs/common';

import { OrdersService } from '../application/services/orders.service.js';
import { PaymentMethod } from '../domain/enums/payment-method.enum.js';
import type { OrderSummaryDto } from './order-summary.dto.js';

/**
 * Cổng giao tiếp DUY NHẤT của module với bên ngoài (payments, jobs...).
 * Chỉ trả về OrderSummaryDto – tuyệt đối không để lộ entity.
 */
@Injectable()
export class OrdersFacade {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Thanh toán thành công: PENDING -> PAID, sinh vé, chốt ghế sang BOOKED.
   * `paidTxnRef` được ghi lên đơn để nhận diện giao dịch đã chốt đơn (chống trả trùng).
   * Ném ORDER_ALREADY_PROCESSED nếu đơn không còn PENDING / đang được xử lý song song,
   * ORDER_SEATS_NO_LONGER_AVAILABLE nếu ghế không còn được giữ cho đơn.
   */
  fulfillOrder(
    orderId: string | number,
    paymentMethod: PaymentMethod,
    paidTxnRef?: string,
  ): Promise<OrderSummaryDto> {
    return this.ordersService.fulfillOrder(
      String(orderId),
      paymentMethod,
      paidTxnRef ?? null,
    );
  }

  /** Hủy các đơn PENDING quá hạn thanh toán và giải phóng ghế (gọi bởi cron/job). */
  cleanupExpiredOrders(): Promise<number> {
    return this.ordersService.cleanupExpiredOrders();
  }

  getOrderSummary(orderId: string | number): Promise<OrderSummaryDto | null> {
    return this.ordersService.findSnapshotById(String(orderId));
  }
}
