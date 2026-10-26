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

  describe('markSeatsAsBooked', () => {
    it('should transition seats to booked in DB and cleanup temporary hold in Redis', async () => {
      vi.mocked(seatInventoryMock.markBooked).mockResolvedValue(2);

      const affected = await service.markSeatsAsBooked('showtime-1', ['s1', 's2'], 'user-1');

      expect(affected).toBe(2);
      expect(seatInventoryMock.markBooked).toHaveBeenCalledWith('showtime-1', ['s1', 's2']);
      expect(seatHoldStoreMock.release).toHaveBeenCalledWith('showtime-1', ['s1', 's2'], 'user-1');
    });
  });

  describe('releaseSeatsForOrder', () => {
    it('should do nothing if seatIds is empty', async () => {
      await service.releaseSeatsForOrder({
        showtimeId: 'showtime-1',
        seatIds: [],
        userId: 'u1',
      });

      expect(seatInventoryMock.releaseForOrder).not.toHaveBeenCalled();
      expect(seatHoldStoreMock.release).not.toHaveBeenCalled();
    });

    it('should release seats from both DB and Redis', async () => {
      await service.releaseSeatsForOrder({
        showtimeId: 'showtime-1',
        seatIds: ['s1', 's2'],
        userId: 'u1',
      });

      expect(seatInventoryMock.releaseForOrder).toHaveBeenCalledWith('showtime-1', ['s1', 's2'], 'u1');
      expect(seatHoldStoreMock.release).toHaveBeenCalledWith('showtime-1', ['s1', 's2'], 'u1');
    });
  });
});

