import { describe, it, expect, vi } from 'vitest';
import type { EventEmitter2 } from '@nestjs/event-emitter';

import { OrderPaidPublisher } from './order-paid.publisher.js';
import { EventNames } from '#src/common/constants/event-names.constant.js';
import type { IOrderRepository } from '../../domain/repositories/order.repository.interface.js';
import type { ITicketDisplayLookup } from '../ports/ticket-display-lookup.port.js';
import type { IFnbCatalog } from '../ports/fnb-catalog.port.js';
import type { ICustomerLookup } from '../ports/customer-lookup.port.js';

const paidOrder = {
  id: '10',
  orderCode: 'ORD-10',
  userId: 'u1',
  showtimeId: '7',
  finalAmount: '241000.00',
  seatDetails: [{ seatId: '1' }, { seatId: '2' }],
  fnbDetails: [{ fnbItemId: '5', quantity: 1 }],
  tickets: [
    { ticketCode: 'TK-A', seatId: '1' },
    { ticketCode: 'TK-B', seatId: '2' },
  ],
};

function setup(overrides: { order?: unknown; customer?: unknown } = {}) {
  const emitter = { emit: vi.fn() } as unknown as EventEmitter2;
  const publisher = new OrderPaidPublisher(
    {
      findByIdWithDetails: vi.fn().mockResolvedValue(
        'order' in overrides ? overrides.order : paidOrder,
      ),
    } as unknown as IOrderRepository,
    {
      getShowtimeDisplayInfo: vi.fn().mockResolvedValue([
        {
          showtimeId: '7',
          movieTitle: 'Mai',
          auditoriumName: 'Phòng 01',
          cineplexName: 'Bến Nghé Plaza',
          startTime: new Date('2026-12-01T03:00:00Z'),
        },
      ]),
      getSeatLabels: vi.fn().mockResolvedValue([
        { seatId: '1', seatNumber: 'H7' },
        { seatId: '2', seatNumber: 'H8' },
      ]),
    } as unknown as ITicketDisplayLookup,
    {
      findByIds: vi.fn().mockResolvedValue([
        { id: '5', name: 'Combo 1', basePrice: 65000, isActive: true },
      ]),
    } as unknown as IFnbCatalog,
    {
      findById: vi.fn().mockResolvedValue(
        'customer' in overrides
          ? overrides.customer
          : { id: 'u1', fullName: 'Khách Test', email: 'khach@example.com', phoneNumber: null },
      ),
    } as unknown as ICustomerLookup,
    emitter,
  );
  return { publisher, emitter };
}

describe('OrderPaidPublisher', () => {
  it('phát order.paid với đủ dữ liệu cho email vé (ghế, phim, rạp, QR = mã vé)', async () => {
    const { publisher, emitter } = setup();

    await publisher.publish('10');

    expect(emitter.emit).toHaveBeenCalledTimes(1);
    const [event, payload] = vi.mocked(emitter.emit).mock.calls[0];
    expect(event).toBe(EventNames.ORDER_PAID);
    expect(payload).toMatchObject({
      orderId: '10',
      orderCode: 'ORD-10',
      customerEmail: 'khach@example.com',
      movieTitle: 'Mai',
      cineplexName: 'Bến Nghé Plaza',
      auditoriumName: 'Phòng 01',
      startTime: '2026-12-01T03:00:00.000Z',
      seats: ['H7', 'H8'],
      fnbItems: [{ name: 'Combo 1', quantity: 1 }],
      totalAmount: 241000,
      tickets: [
        { ticketCode: 'TK-A', seatCode: 'H7', qrPayload: 'TK-A' },
        { ticketCode: 'TK-B', seatCode: 'H8', qrPayload: 'TK-B' },
      ],
    });
  });

  it('không phát event khi không tìm thấy khách hàng', async () => {
    const { publisher, emitter } = setup({ customer: null });
    await publisher.publish('10');
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it('lỗi khi đọc dữ liệu không ném ra ngoài (không làm hỏng thanh toán)', async () => {
    const { publisher, emitter } = setup();
    // findByIdWithDetails ném lỗi
    (publisher as any).orderRepository.findByIdWithDetails = vi.fn().mockRejectedValue(new Error('db down'));
    await expect(publisher.publish('10')).resolves.toBeUndefined();
    expect(emitter.emit).not.toHaveBeenCalled();
  });
});
