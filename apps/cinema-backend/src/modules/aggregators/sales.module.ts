import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module.js';
import { FnbModule } from '../fnb/fnb.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { PaymentsModule } from '../payments/payments.module.js';
import { PromotionsModule } from '../promotions/promotions.module.js';

/**
 * Trục Sales: Bookings, Orders, Payments, Promotions, Fnb, Notifications.
 *
 * Chiều phụ thuộc: Bookings (phụ thuộc Showtimes+Cinemas ở trục Cinema Core)
 * → Orders (phụ thuộc Bookings, Fnb, Promotions, Users ở trục Identity)
 * → Payments (phụ thuộc Orders). Promotions và Notifications là module lá,
 * chỉ nghe event, không ai gọi trực tiếp ngoại trừ Orders gọi
 * PromotionsFacade.calculateDiscount().
 *
 * NotificationsModule KHÔNG có public-api (đúng thiết kế đã thống nhất) nên
 * chỉ cần nằm trong tree để listener của nó được Nest khởi tạo và lắng nghe
 * EventEmitter2 — không module nào cần "gọi" NotificationsModule.
 */
@Module({
  imports: [
    FnbModule,
    PromotionsModule,
    BookingsModule,
    OrdersModule,
    PaymentsModule,
    NotificationsModule,
  ],
})
export class SalesModule {}
