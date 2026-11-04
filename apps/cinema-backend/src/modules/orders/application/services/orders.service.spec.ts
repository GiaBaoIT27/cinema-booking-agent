import { describe, it, expect, vi, beforeEach } from 'vitest';

import { OrdersService } from './orders.service.js';
import { OrderStatus } from '../../domain/enums/order-status.enum.js';
import { PaymentMethod } from '../../domain/enums/payment-method.enum.js';
import {
  ORDER_EXPIRY_MINUTES,
  SEAT_CLAIM_BUFFER_MINUTES,
} from '../../domain/rules/order-rules.js';
import type { IOrderRepository } from '../../domain/repositories/order.repository.interface.js';
import type { ITicketRepository } from '../../domain/repositories/ticket.repository.interface.js';
import type { IUnitOfWork, TransactionContext } from '../../domain/ports/transaction.port.js';
import type { ISeatReservation } from '../ports/seat-reservation.port.js';
import type { IFnbCatalog } from '../ports/fnb-catalog.port.js';
import type { IVoucherCalculator } from '../ports/voucher-calculator.port.js';
import { ErrorCode } from '#src/common/constants/error-codes.enum.js';

const TX = { __brand: 'TransactionContext' } as TransactionContext;

describe('OrdersService – chống bán trùng ghế', () => {
  let service: OrdersService;
  let orderRepo: IOrderRepository;
  let ticketRepo: ITicketRepository;
  let seats: ISeatReservation;
  let unitOfWork: IUnitOfWork;

  beforeEach(() => {
    orderRepo = {
      createPending: vi.fn(),
      findById: vi.fn(),
      findByIdWithSeatDetails: vi.fn(),
      findSeatIds: vi.fn(),
      save: vi.fn(),
      transitionStatus: vi.fn().mockResolvedValue(true),
      cancelPendingFnbDetails: vi.fn(),
      findExpiredPending: vi.fn(),
    } as unknown as IOrderRepository;
    ticketRepo = { createMany: vi.fn() } as unknown as ITicketRepository;
    seats = {
      validateHolding: vi.fn(),
      reserveForOrder: vi.fn(),
      cancelReservationForOrder: vi.fn().mockResolvedValue(undefined),
      markBooked: vi.fn(),
      isBookedForOrder: vi.fn().mockResolvedValue(false),
      revertBooked: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
    } as unknown as ISeatReservation;
    unitOfWork = {
      run: vi.fn((work: (tx: TransactionContext) => Promise<unknown>) => work(TX)),
    } as unknown as IUnitOfWork;

    service = new OrdersService(
      orderRepo,
      ticketRepo,
      seats,
      { findByIds: vi.fn() } as unknown as IFnbCatalog,
      { calculateDiscount: vi.fn() } as unknown as IVoucherCalculator,
      unitOfWork,
    );
  });

  describe('createOrder', () => {
    const dto = { showtimeId: 7, seatIds: [1, 2], channel: 'WEB' } as any;

    beforeEach(() => {
      vi.mocked(seats.validateHolding).mockResolvedValue({
        isValid: true,
        subtotalTickets: 200000,
        seats: [
          { seatId: '1', seatTypeId: 'std', price: 100000, ticketCode: 'T1' },
          { seatId: '2', seatTypeId: 'std', price: 100000, ticketCode: 'T2' },
        ],
      });
    });

    it('gắn ghế vào đơn với hạn giữ = hạn thanh toán + khoảng đệm, trước khi ghi đơn', async () => {
      vi.mocked(seats.reserveForOrder).mockResolvedValue(true);
      vi.mocked(orderRepo.createPending).mockImplementation(async (data) =>
        ({ ...data.order, id: '99', status: OrderStatus.PENDING }) as any,
      );

      const res = await service.createOrder('u1', dto);

      const reserveArgs = vi.mocked(seats.reserveForOrder).mock.calls[0][0];
      const created = vi.mocked(orderRepo.createPending).mock.calls[0][0].order;
      expect(reserveArgs).toMatchObject({ showtimeId: '7', seatIds: ['1', '2'], userId: 'u1' });
      expect(reserveArgs.orderCode).toBe(created.orderCode);
      expect(reserveArgs.holdUntil.getTime() - created.expiresAt.getTime()).toBe(
        SEAT_CLAIM_BUFFER_MINUTES * 60 * 1000,
      );
      expect(created.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(
        ORDER_EXPIRY_MINUTES * 60 * 1000,
      );
      expect(res.orderCode).toBe(created.orderCode);
    });

    it('từ chối khi ghế không còn gắn được (đã thuộc đơn khác / hết hạn) và không tạo đơn', async () => {
      vi.mocked(seats.reserveForOrder).mockResolvedValue(false);

      await expect(service.createOrder('u1', dto)).rejects.toMatchObject({
        errorCode: ErrorCode.SEATS_HOLD_EXPIRED_OR_INVALID,
      });
      expect(orderRepo.createPending).not.toHaveBeenCalled();
    });

    it('ghi đơn lỗi => gỡ gắn đơn khỏi ghế rồi ném lại lỗi', async () => {
      vi.mocked(seats.reserveForOrder).mockResolvedValue(true);
      vi.mocked(orderRepo.createPending).mockRejectedValue(new Error('db down'));

      await expect(service.createOrder('u1', dto)).rejects.toThrow('db down');

      const { orderCode } = vi.mocked(seats.reserveForOrder).mock.calls[0][0];
      expect(seats.cancelReservationForOrder).toHaveBeenCalledWith({
        showtimeId: '7',
        seatIds: ['1', '2'],
        orderCode,
      });
    });
  });

  describe('fulfillOrder', () => {
    const pendingOrder = () =>
      ({
        id: '10',
        orderCode: 'ORD-10',
        userId: 'u1',
        showtimeId: '7',
        status: OrderStatus.PENDING,
        finalAmount: 200000,
        seatDetails: [
          { seatId: '1', price: 100000 },
          { seatId: '2', price: 100000 },
        ],
      }) as any;

    it('chốt ghế của đơn rồi mới sinh vé', async () => {
      vi.mocked(orderRepo.findByIdWithSeatDetails).mockResolvedValue(pendingOrder());
      vi.mocked(seats.markBooked).mockResolvedValue(true);

      const snapshot = await service.fulfillOrder('10', PaymentMethod.VNPAY);

      expect(seats.markBooked).toHaveBeenCalledWith({
        showtimeId: '7',
        seatIds: ['1', '2'],
        orderCode: 'ORD-10',
        userId: 'u1',
      });
      expect(ticketRepo.createMany).toHaveBeenCalledTimes(1);
      expect(vi.mocked(seats.markBooked).mock.invocationCallOrder[0]).toBeLessThan(
        vi.mocked(ticketRepo.createMany).mock.invocationCallOrder[0],
      );
      expect(snapshot.status).toBe(OrderStatus.PAID);
    });

    it('KHÔNG sinh vé khi ghế không còn thuộc đơn (đã bị người khác lấy)', async () => {
      vi.mocked(orderRepo.findByIdWithSeatDetails).mockResolvedValue(pendingOrder());
      vi.mocked(orderRepo.findById).mockResolvedValue(pendingOrder());
      vi.mocked(seats.markBooked).mockResolvedValue(false);

      await expect(service.fulfillOrder('10', PaymentMethod.VNPAY)).rejects.toMatchObject({
        errorCode: ErrorCode.ORDER_SEATS_NO_LONGER_AVAILABLE,
      });
      expect(ticketRepo.createMany).not.toHaveBeenCalled();
      expect(orderRepo.save).not.toHaveBeenCalled();
    });

    it('request song song đã xử lý đơn => báo ORDER_ALREADY_PROCESSED, không sinh vé lần 2', async () => {
      vi.mocked(orderRepo.findByIdWithSeatDetails).mockResolvedValue(pendingOrder());
      vi.mocked(orderRepo.findById).mockResolvedValue({
        ...pendingOrder(),
        status: OrderStatus.PAID,
      });
      vi.mocked(seats.markBooked).mockResolvedValue(false);

      await expect(service.fulfillOrder('10', PaymentMethod.VNPAY)).rejects.toMatchObject({
        errorCode: ErrorCode.ORDER_ALREADY_PROCESSED,
      });
      expect(ticketRepo.createMany).not.toHaveBeenCalled();
    });

    it('ghi PAID bằng compare-and-set và lưu mã giao dịch đã chốt đơn', async () => {
      vi.mocked(orderRepo.findByIdWithSeatDetails).mockResolvedValue(pendingOrder());
      vi.mocked(seats.markBooked).mockResolvedValue(true);

      const snapshot = await service.fulfillOrder('10', PaymentMethod.VNPAY, 'ORD-10_1');

      expect(orderRepo.transitionStatus).toHaveBeenCalledWith(
        '10',
        OrderStatus.PENDING,
        OrderStatus.PAID,
        TX,
        { paymentMethod: PaymentMethod.VNPAY, paidTxnRef: 'ORD-10_1' },
      );
      expect(snapshot.paidTxnRef).toBe('ORD-10_1');
    });

    it('IPN lặp song song: ghế đã BOOKED cho CHÍNH đơn này => ALREADY_PROCESSED (không phải mất ghế)', async () => {
      vi.mocked(orderRepo.findByIdWithSeatDetails).mockResolvedValue(pendingOrder());
      vi.mocked(orderRepo.findById).mockResolvedValue(pendingOrder()); // request kia chưa commit
      vi.mocked(seats.markBooked).mockResolvedValue(false);
      vi.mocked(seats.isBookedForOrder).mockResolvedValue(true);

      await expect(service.fulfillOrder('10', PaymentMethod.VNPAY)).rejects.toMatchObject({
        errorCode: ErrorCode.ORDER_ALREADY_PROCESSED,
      });
      expect(ticketRepo.createMany).not.toHaveBeenCalled();
    });

    it('thua job hủy đơn quá hạn (CAS PENDING->PAID thất bại) => không sinh vé, trả ghế về HOLDING', async () => {
      vi.mocked(orderRepo.findByIdWithSeatDetails).mockResolvedValue(pendingOrder());
      vi.mocked(seats.markBooked).mockResolvedValue(true);
      vi.mocked(orderRepo.transitionStatus).mockResolvedValue(false);

      await expect(service.fulfillOrder('10', PaymentMethod.VNPAY)).rejects.toMatchObject({
        errorCode: ErrorCode.ORDER_ALREADY_PROCESSED,
      });
      expect(ticketRepo.createMany).not.toHaveBeenCalled();
      expect(seats.revertBooked).toHaveBeenCalled();
    });

    it('sinh vé lỗi (VD: vi phạm unique vé) => trả ghế về HOLDING cho đơn', async () => {
      vi.mocked(orderRepo.findByIdWithSeatDetails).mockResolvedValue(pendingOrder());
      vi.mocked(seats.markBooked).mockResolvedValue(true);
      vi.mocked(ticketRepo.createMany).mockRejectedValue(new Error('duplicate key'));

      await expect(service.fulfillOrder('10', PaymentMethod.VNPAY)).rejects.toThrow(
        'duplicate key',
      );
      expect(seats.revertBooked).toHaveBeenCalledWith({
        showtimeId: '7',
        seatIds: ['1', '2'],
        orderCode: 'ORD-10',
        userId: 'u1',
      });
    });
  });

  describe('cleanupExpiredOrders', () => {
    it('đơn vừa được thanh toán (thua CAS) thì KHÔNG nhả ghế, không tính là đã hủy', async () => {
      vi.mocked(orderRepo.findExpiredPending).mockResolvedValue([
        { id: '10', orderCode: 'ORD-10', userId: 'u1', showtimeId: '7', status: OrderStatus.PENDING } as any,
      ]);
      vi.mocked(orderRepo.findSeatIds).mockResolvedValue(['1']);
      vi.mocked(orderRepo.transitionStatus).mockResolvedValue(false);

      expect(await service.cleanupExpiredOrders()).toBe(0);
      expect(seats.release).not.toHaveBeenCalled();
      expect(orderRepo.cancelPendingFnbDetails).not.toHaveBeenCalled();
    });

    it('đơn quá hạn: PENDING -> EXPIRED rồi nhả ghế của đơn', async () => {
      vi.mocked(orderRepo.findExpiredPending).mockResolvedValue([
        { id: '10', orderCode: 'ORD-10', userId: 'u1', showtimeId: '7', status: OrderStatus.PENDING } as any,
      ]);
      vi.mocked(orderRepo.findSeatIds).mockResolvedValue(['1']);

      expect(await service.cleanupExpiredOrders()).toBe(1);
      expect(orderRepo.transitionStatus).toHaveBeenCalledWith(
        '10',
        OrderStatus.PENDING,
        OrderStatus.EXPIRED,
        TX,
      );
      expect(seats.release).toHaveBeenCalledWith(
        expect.objectContaining({ orderCode: 'ORD-10' }),
      );
    });
  });

  describe('cancelOrder', () => {
    it('chỉ nhả ghế gắn với đúng mã đơn', async () => {
      vi.mocked(orderRepo.findById).mockResolvedValue({
        id: '10',
        orderCode: 'ORD-10',
        userId: 'u1',
        showtimeId: '7',
        status: OrderStatus.PENDING,
      } as any);
      vi.mocked(orderRepo.findSeatIds).mockResolvedValue(['1', '2']);

      await service.cancelOrder('u1', '10');

      expect(seats.release).toHaveBeenCalledWith({
        showtimeId: '7',
        seatIds: ['1', '2'],
        orderCode: 'ORD-10',
        userId: 'u1',
      });
    });
  });
});
