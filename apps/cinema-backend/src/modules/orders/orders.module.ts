import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PromotionsModule } from '#modules/promotions/promotions.module.js';
import { BookingsModule } from '#modules/bookings/bookings.module.js';
import { FnbModule } from '#modules/fnb/fnb.module.js';
import { ShowtimesModule } from '#modules/showtimes/showtimes.module.js';
import { MoviesModule } from '#modules/movies/movies.module.js';
import { CinemasModule } from '#modules/cinemas/cinemas.module.js';

import { Order } from './domain/entities/order.entity.js';
import { OrderSeatDetail } from './domain/entities/order-seat-details.entity.js';
import { OrderFnbDetail } from './domain/entities/order-fnb-details.entity.js';
import { Ticket } from './domain/entities/ticket.entity.js';
import { UNIT_OF_WORK } from './domain/ports/transaction.port.js';
import { ORDER_REPOSITORY } from './domain/repositories/order.repository.interface.js';
import { TICKET_REPOSITORY } from './domain/repositories/ticket.repository.interface.js';

import { SEAT_RESERVATION } from './application/ports/seat-reservation.port.js';
import { FNB_CATALOG } from './application/ports/fnb-catalog.port.js';
import { VOUCHER_CALCULATOR } from './application/ports/voucher-calculator.port.js';
import { TICKET_DISPLAY_LOOKUP } from './application/ports/ticket-display-lookup.port.js';

import { TypeOrmOrderRepository } from './infrastructure/persistence/typeorm-order.repository.js';
import { TypeOrmTicketRepository } from './infrastructure/persistence/typeorm-ticket.repository.js';
import { TypeOrmUnitOfWork } from './infrastructure/persistence/typeorm-unit-of-work.js';
import { BookingsFacadeAdapter } from './infrastructure/adapters/bookings-facade.adapter.js';
import { FnbFacadeAdapter } from './infrastructure/adapters/fnb-facade.adapter.js';
import { PromotionsServiceAdapter } from './infrastructure/adapters/promotions-service.adapter.js';
import { TicketDisplayAdapter } from './infrastructure/adapters/ticket-display.adapter.js';

import { OrdersController } from './presentation/controllers/orders.controller.js';
import { TicketsController } from './presentation/controllers/tickets.controller.js';
import { OrdersService } from './application/services/orders.service.js';
import { TicketsService } from './application/services/tickets.service.js';
import { OrdersFacade } from './public-api/orders.facade.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderSeatDetail, OrderFnbDetail, Ticket]),
    PromotionsModule,
    BookingsModule,
    FnbModule,
    ShowtimesModule,
    MoviesModule,
    CinemasModule,
  ],
  controllers: [OrdersController, TicketsController],
  providers: [
    // Persistence
    { provide: ORDER_REPOSITORY, useClass: TypeOrmOrderRepository },
    { provide: TICKET_REPOSITORY, useClass: TypeOrmTicketRepository },
    { provide: UNIT_OF_WORK, useClass: TypeOrmUnitOfWork },
    // Cổng sang module khác
    { provide: SEAT_RESERVATION, useClass: BookingsFacadeAdapter },
    { provide: FNB_CATALOG, useClass: FnbFacadeAdapter },
    { provide: VOUCHER_CALCULATOR, useClass: PromotionsServiceAdapter },
    { provide: TICKET_DISPLAY_LOOKUP, useClass: TicketDisplayAdapter },
    // Application
    OrdersService,
    TicketsService,
    OrdersFacade,
  ],
  exports: [OrdersFacade], // Only export facade for other modules
})
export class OrdersModule {}
