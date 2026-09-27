import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentTransaction } from './entities/payment-transaction.entity.js';
import { PaymentService } from './payment.service.js';
import { PaymentController } from './payment.controller.js';

import { OrdersModule } from '#modules/orders/orders.module.js';
import { Order } from '#modules/orders/entities/order.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentTransaction, Order]),
    // Import OrdersModule để sử dụng OrderService.fulfillOrder
    OrdersModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentsModule {}
