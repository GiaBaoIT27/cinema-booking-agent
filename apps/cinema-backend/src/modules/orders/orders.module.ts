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
import { TicketsController } from './controllers/ticket.controller.js';
import { TicketsService } from './services/ticket.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      Ticket,
      OrderSeatDetail,
      OrderFnbDetail,
      FnbItem,
    ]),
    PromotionsModule,
    BookingsModule,
  ],
  controllers: [OrderController, TicketsController],
  providers: [OrderService, TicketsService],
  exports: [OrderService, TicketsService],
})
export class OrdersModule {}
