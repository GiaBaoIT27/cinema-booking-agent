import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Order } from './entities/order.entity.js';
import { Ticket } from './entities/ticket.entity.js';
import { OrderFnbDetail } from './entities/order-fnb-details.entity.js';
import { OrderSeatDetail } from './entities/order-seat-details.entity.js';
import { FnbItem } from '#modules/fnb/entities/fnb-item.entities.js';

import { PromotionsModule } from '#modules/promotions/promotions.module.js';
import { BookingsModule } from '#modules/bookings/bookings.module.js';

import { OrderController } from './controllers/order.controller.js';
import { OrderService } from './services/order.service.js';

@Module({
  imports: [
    // Đăng ký entity thuộc phạm vi Orders
    TypeOrmModule.forFeature([Order, Ticket, OrderSeatDetail, OrderFnbDetail, FnbItem]),
    // Tái sử dụng PromotionsService để validate & tính giảm giá voucher
    PromotionsModule,
    // Import BookingsModule để dùng BookingService (validate ghế HOLDING, giải phóng ghế)
    // Chiều phụ thuộc: OrdersModule -> BookingsModule (một chiều, không vòng tròn)
    BookingsModule,
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrdersModule {}
