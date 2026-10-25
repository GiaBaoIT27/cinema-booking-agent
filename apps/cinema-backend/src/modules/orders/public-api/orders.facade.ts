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

  /** Thanh toán thành công: PENDING -> PAID, sinh vé, chốt ghế sang BOOKED. */
  fulfillOrder(
    orderId: string | number,
    paymentMethod: PaymentMethod,
  ): Promise<OrderSummaryDto> {
    return this.ordersService.fulfillOrder(String(orderId), paymentMethod);
  }

  /** Hủy các đơn PENDING quá hạn thanh toán và giải phóng ghế (gọi bởi cron/job). */
  cleanupExpiredOrders(): Promise<number> {
    return this.ordersService.cleanupExpiredOrders();
  }

  getOrderSummary(orderId: string | number): Promise<OrderSummaryDto | null> {
    return this.ordersService.findSnapshotById(String(orderId));
  }
}
