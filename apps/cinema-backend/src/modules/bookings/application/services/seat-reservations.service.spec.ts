import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SeatReservationsService } from './seat-reservations.service.js';
import type { ISeatInventory } from '../ports/seat-inventory.port.js';
import type { IShowtimeLookup } from '../ports/showtime-lookup.port.js';
import type { ISeatCatalog } from '../ports/seat-catalog.port.js';
import type { ISeatHoldStore } from '../ports/seat-hold-store.port.js';

describe('SeatReservationsService (Application)', () => {
  let service: SeatReservationsService;
  let seatInventoryMock: ISeatInventory;
  let showtimeLookupMock: IShowtimeLookup;
  let seatCatalogMock: ISeatCatalog;
  let seatHoldStoreMock: ISeatHoldStore;

  beforeEach(() => {
    seatInventoryMock = {
      findActiveHolds: vi.fn(),
      markBooked: vi.fn(),
      claimForOrder: vi.fn(),
      releaseForOrder: vi.fn(),
      findExpiredHolds: vi.fn(),
      releaseExpiredHolds: vi.fn(),
    } as unknown as ISeatInventory;

    showtimeLookupMock = {
      getSeatPrices: vi.fn(),
    } as unknown as IShowtimeLookup;

    seatCatalogMock = {
      findByIds: vi.fn(),
    } as unknown as ISeatCatalog;

    seatHoldStoreMock = {
      release: vi.fn(),
      extend: vi.fn(),
    } as unknown as ISeatHoldStore;

    service = new SeatReservationsService(
      seatInventoryMock,
      showtimeLookupMock,
      seatCatalogMock,
      seatHoldStoreMock,
    );
  });

  describe('validateHoldingSeats', () => {
    const input = {
      userId: 'user-123',
      showtimeId: 'showtime-456',
      seatIds: ['seat-1', 'seat-2'],
    };

    it('should return isValid: false if not all seats are actively held by this user', async () => {
      // User only holds 1 of 2 requested seats
      vi.mocked(seatInventoryMock.findActiveHolds).mockResolvedValue([
        { seatId: 'seat-1' } as any,
      ]);

      const result = await service.validateHoldingSeats(input);

      expect(result.isValid).toBe(false);
      expect(result.subtotalTickets).toBe(0);
      expect(result.seats).toEqual([]);
    });

    it('should return isValid: false if seat price mapping is missing', async () => {
      vi.mocked(seatInventoryMock.findActiveHolds).mockResolvedValue([
        { seatId: 'seat-1' } as any,
        { seatId: 'seat-2' } as any,
      ]);
      vi.mocked(seatCatalogMock.findByIds).mockResolvedValue([
        { id: 'seat-1', seatTypeId: 'vip' } as any,
        { id: 'seat-2', seatTypeId: 'standard' } as any,
      ]);
      // Only VIP price exists, Standard is missing
      vi.mocked(showtimeLookupMock.getSeatPrices).mockResolvedValue([
        { seatTypeId: 'vip', finalPrice: 100000 } as any,
      ]);

      const result = await service.validateHoldingSeats(input);

      expect(result.isValid).toBe(false);
      expect(result.subtotalTickets).toBe(0);
    });

    it('should return isValid: true with calculated subtotal and ticket codes when all conditions met', async () => {
      vi.mocked(seatInventoryMock.findActiveHolds).mockResolvedValue([
        { seatId: 'seat-1' } as any,
        { seatId: 'seat-2' } as any,
      ]);
      vi.mocked(seatCatalogMock.findByIds).mockResolvedValue([
        { id: 'seat-1', seatTypeId: 'standard' } as any,
        { id: 'seat-2', seatTypeId: 'vip' } as any,
      ]);
      vi.mocked(showtimeLookupMock.getSeatPrices).mockResolvedValue([
        { seatTypeId: 'standard', finalPrice: 80000 } as any,
        { seatTypeId: 'vip', finalPrice: 110000 } as any,
      ]);

      const result = await service.validateHoldingSeats(input);

      expect(result.isValid).toBe(true);
      expect(result.subtotalTickets).toBe(190000);
      expect(result.seats).toHaveLength(2);
      expect(result.seats[0]).toMatchObject({
        seatId: 'seat-1',
        seatTypeId: 'standard',
        price: 80000,
      });
      expect(result.seats[0].ticketCode).toMatch(/^TKT-/);
      expect(result.seats[1]).toMatchObject({
        seatId: 'seat-2',
        seatTypeId: 'vip',
        price: 110000,
      });
    });
  });

  describe('reserveSeatsForOrder', () => {
    const input = {
      showtimeId: 'showtime-1',
      seatIds: ['s1', 's2'],
      userId: 'u1',
      orderCode: 'ORD-1',
      holdUntil: new Date(Date.now() + 15 * 60 * 1000),
    };

    it('should claim seats in DB then extend the Redis lock', async () => {
      vi.mocked(seatInventoryMock.claimForOrder).mockResolvedValue(true);

      const ok = await service.reserveSeatsForOrder(input);

      expect(ok).toBe(true);
      expect(seatInventoryMock.claimForOrder).toHaveBeenCalledWith(
        'showtime-1', ['s1', 's2'], 'u1', 'ORD-1', input.holdUntil, expect.any(Date),
      );
      expect(seatHoldStoreMock.extend).toHaveBeenCalledWith(
        'showtime-1', ['s1', 's2'], 'u1', expect.any(Number),
      );
    });

    it('should return false and not touch Redis when DB claim fails', async () => {
      vi.mocked(seatInventoryMock.claimForOrder).mockResolvedValue(false);

      const ok = await service.reserveSeatsForOrder(input);

      expect(ok).toBe(false);
      expect(seatHoldStoreMock.extend).not.toHaveBeenCalled();
    });

    it('should still succeed when Redis extension throws (DB is the source of truth)', async () => {
      vi.mocked(seatInventoryMock.claimForOrder).mockResolvedValue(true);
      vi.mocked(seatHoldStoreMock.extend).mockRejectedValue(new Error('redis down'));

      await expect(service.reserveSeatsForOrder(input)).resolves.toBe(true);
    });
  });

  describe('markSeatsAsBooked', () => {
    const input = { showtimeId: 'showtime-1', seatIds: ['s1', 's2'], orderCode: 'ORD-1', userId: 'user-1' };

    it('should book seats of the order in DB and cleanup temporary hold in Redis', async () => {
      vi.mocked(seatInventoryMock.markBooked).mockResolvedValue(true);

      const booked = await service.markSeatsAsBooked(input);

      expect(booked).toBe(true);
      expect(seatInventoryMock.markBooked).toHaveBeenCalledWith('showtime-1', ['s1', 's2'], 'ORD-1');
      expect(seatHoldStoreMock.release).toHaveBeenCalledWith('showtime-1', ['s1', 's2'], 'user-1');
    });

    it('should return false and keep Redis untouched when not all seats can be booked', async () => {
      vi.mocked(seatInventoryMock.markBooked).mockResolvedValue(false);

      const booked = await service.markSeatsAsBooked(input);

      expect(booked).toBe(false);
      expect(seatHoldStoreMock.release).not.toHaveBeenCalled();
    });
  });

  describe('releaseSeatsForOrder', () => {
    it('should do nothing if seatIds is empty', async () => {
      await service.releaseSeatsForOrder({
        showtimeId: 'showtime-1',
        seatIds: [],
        orderCode: 'ORD-1',
        userId: 'u1',
      });

      expect(seatInventoryMock.releaseForOrder).not.toHaveBeenCalled();
      expect(seatHoldStoreMock.release).not.toHaveBeenCalled();
    });

    it('should release seats of the order from both DB and Redis', async () => {
      await service.releaseSeatsForOrder({
        showtimeId: 'showtime-1',
        seatIds: ['s1', 's2'],
        orderCode: 'ORD-1',
        userId: 'u1',
      });

      expect(seatInventoryMock.releaseForOrder).toHaveBeenCalledWith('showtime-1', ['s1', 's2'], 'ORD-1', 'u1');
      expect(seatHoldStoreMock.release).toHaveBeenCalledWith('showtime-1', ['s1', 's2'], 'u1');
    });
  });
});

