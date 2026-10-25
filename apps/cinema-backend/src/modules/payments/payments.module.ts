import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Payment } from './domain/entities/payment.entity.js';
import { PaymentTransaction } from './domain/entities/payment-transaction.entity.js';
import { PAYMENT_REPOSITORY } from './domain/repositories/payment.repository.interface.js';
import { TypeOrmPaymentRepository } from './infrastructure/persistence/typeorm-payment.repository.js';

import { VnPayGateway } from './infrastructure/gateways/vnpay/vnpay.gateway.js';
import { PaymentGatewayRegistry } from './infrastructure/gateways/payment-gateway.registry.js';

import { PaymentsService } from './application/services/payments.service.js';
import { RefundService } from './application/services/refund.service.js';

import { PaymentsController } from './presentation/controllers/payments.controller.js';
import { VnPayIpnController } from './presentation/controllers/vnpay-ipn.controller.js';
import { PaymentsFacade } from './public-api/payments.facade.js';

import { OrdersModule } from '#modules/orders/orders.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentTransaction]),
    OrdersModule,
  ],
  controllers: [PaymentsController, VnPayIpnController],
  providers: [
    // Persistence
    { provide: PAYMENT_REPOSITORY, useClass: TypeOrmPaymentRepository },

    // Gateways Strategy
    VnPayGateway,
    PaymentGatewayRegistry,

    // Services
    PaymentsService,
    RefundService,

    // Public Facade
    PaymentsFacade,
  ],
  exports: [PaymentsFacade, PaymentsService],
})
export class PaymentsModule {}
