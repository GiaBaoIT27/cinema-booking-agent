/**
 * Integration test (Postgres thật) cho các bước chuyển trạng thái nguyên tử của luồng thanh toán:
 * đây là thứ đảm bảo IPN gửi lặp/song song không xử lý tiền 2 lần, và job hủy đơn
 * không "giành" mất đơn vừa được thanh toán.
 * Chạy: npm run test:int
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';

import { createIntegrationDataSource } from '#src/test-utils/integration-db.js';
import { Payment } from '../../domain/entities/payment.entity.js';
import { PaymentTransaction } from '../../domain/entities/payment-transaction.entity.js';
import { PaymentStatus } from '../../domain/enums/payment-status.enum.js';
import { PaymentMethod } from '../../domain/enums/payment-method.enum.js';
import { TypeOrmPaymentRepository } from './typeorm-payment.repository.js';
import { Order } from '#modules/orders/domain/entities/order.entity.js';
import { OrderSeatDetail } from '#modules/orders/domain/entities/order-seat-details.entity.js';
import { OrderFnbDetail } from '#modules/orders/domain/entities/order-fnb-details.entity.js';
import { OrderStatus } from '#modules/orders/domain/enums/order-status.enum.js';
import { OrderChannel } from '#modules/orders/domain/enums/order-channel.enum.js';
import { PaymentMethod as OrderPaymentMethod } from '#modules/orders/domain/enums/payment-method.enum.js';
import { TypeOrmOrderRepository } from '#modules/orders/infrastructure/persistence/typeorm-order.repository.js';
import { TypeOrmUnitOfWork } from '#modules/orders/infrastructure/persistence/typeorm-unit-of-work.js';

describe('Chuyển trạng thái nguyên tử của thanh toán & đơn hàng (Postgres thật)', () => {
  let ds: DataSource;
  let payments: TypeOrmPaymentRepository;
  let orders: TypeOrmOrderRepository;
  let uow: TypeOrmUnitOfWork;

  beforeAll(async () => {
    ds = await createIntegrationDataSource();
    payments = new TypeOrmPaymentRepository(
      ds.getRepository(Payment),
      ds.getRepository(PaymentTransaction),
    );
    orders = new TypeOrmOrderRepository(
      ds.getRepository(Order),
      ds.getRepository(OrderSeatDetail),
      ds.getRepository(OrderFnbDetail),
    );
    uow = new TypeOrmUnitOfWork(ds);
  });

  afterAll(async () => {
    await ds?.destroy();
  });

  beforeEach(async () => {
    await ds.query('TRUNCATE payment_transactions, payments, orders CASCADE');
  });

  const newTxn = (txnRef: string, status = PaymentStatus.INITIATED) =>
    payments.createTransaction({
      orderId: '1',
      txnRef,
      paymentGateway: PaymentMethod.VNPAY,
      amount: 50000,
      paymentStatus: status,
    });

  const newOrder = async () => {
    const order = await ds.getRepository(Order).save(
      ds.getRepository(Order).create({
        orderCode: `ORD-${Date.now()}-${Math.random()}`,
        userId: '1',
        showtimeId: '1',
        channel: OrderChannel.ONLINE_WEB,
        subtotalTickets: 100000,
        subtotalFnb: 0,
        discountAmount: 0,
        finalAmount: 100000,
        status: OrderStatus.PENDING,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      }),
    );
    return order.id;
  };

  it('20 IPN thành công song song cho cùng txnRef => đúng 1 request thắng INITIATED -> SUCCESS', async () => {
    await newTxn('T-1');

    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        payments.transitionTransaction('T-1', PaymentStatus.INITIATED, PaymentStatus.SUCCESS, {
          paidAt: new Date(),
          transactionNo: 'vnp-1',
        }),
      ),
    );

    expect(results.filter(Boolean)).toHaveLength(1);
    const txn = await payments.findTransactionByTxnRef('T-1');
    expect(txn).toMatchObject({ paymentStatus: PaymentStatus.SUCCESS, transactionNo: 'vnp-1' });
  });

  it('IPN thành công và IPN thất bại đến cùng lúc => chỉ một kết quả được ghi nhận', async () => {
    await newTxn('T-2');

    const [ok, failed] = await Promise.all([
      payments.transitionTransaction('T-2', PaymentStatus.INITIATED, PaymentStatus.SUCCESS),
      payments.transitionTransaction('T-2', PaymentStatus.INITIATED, PaymentStatus.FAILED),
    ]);

    expect(Number(ok) + Number(failed)).toBe(1);
  });

  it('hoàn tiền chỉ chạy một lần: REFUND_PENDING -> REFUNDED song song', async () => {
    await newTxn('T-3', PaymentStatus.REFUND_PENDING);

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        payments.transitionTransaction('T-3', PaymentStatus.REFUND_PENDING, PaymentStatus.REFUNDED),
      ),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it('job đối soát chỉ thấy giao dịch SUCCESS chưa chốt sổ, đã qua thời gian chờ', async () => {
    const old = new Date(Date.now() - 5 * 60 * 1000);
    await newTxn('U-old');
    await payments.transitionTransaction('U-old', PaymentStatus.INITIATED, PaymentStatus.SUCCESS, { paidAt: old });
    await newTxn('U-settled');
    await payments.transitionTransaction('U-settled', PaymentStatus.INITIATED, PaymentStatus.SUCCESS, { paidAt: old });
    await payments.markTransactionSettled('U-settled', new Date());
    await newTxn('U-fresh');
    await payments.transitionTransaction('U-fresh', PaymentStatus.INITIATED, PaymentStatus.SUCCESS, { paidAt: new Date() });

    await newTxn('U-ancient');
    await payments.transitionTransaction('U-ancient', PaymentStatus.INITIATED, PaymentStatus.SUCCESS, {
      paidAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    });

    const found = await payments.findUnsettledSuccessful(
      new Date(Date.now() - 60 * 1000),
      10,
      new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    );
    // U-ancient (quá cửa sổ đối soát) bị bỏ qua: không tự động xử lý dữ liệu cũ/bất thường
    expect(found.map((t) => t.txnRef)).toEqual(['U-old']);
  });

  it('thanh toán và job hủy đơn quá hạn chạy cùng lúc => đơn chỉ có MỘT trạng thái cuối', async () => {
    for (let i = 0; i < 10; i++) {
      const orderId = await newOrder();

      const [paid, expired] = await Promise.all([
        uow.run((tx) =>
          orders.transitionStatus(orderId, OrderStatus.PENDING, OrderStatus.PAID, tx, {
            paymentMethod: OrderPaymentMethod.VNPAY,
            paidTxnRef: 'T-x',
          }),
        ),
        uow.run((tx) =>
          orders.transitionStatus(orderId, OrderStatus.PENDING, OrderStatus.EXPIRED, tx),
        ),
      ]);

      expect(Number(paid) + Number(expired)).toBe(1);
      const order = await ds.getRepository(Order).findOneByOrFail({ id: orderId });
      expect(order.status).toBe(paid ? OrderStatus.PAID : OrderStatus.EXPIRED);
      expect(order.paidTxnRef).toBe(paid ? 'T-x' : null);
    }
  });
});
