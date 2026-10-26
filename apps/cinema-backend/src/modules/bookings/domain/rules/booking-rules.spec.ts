import { describe, it, expect } from 'vitest';
import {
  SEAT_HOLD_DURATION_MS,
  isShowtimeHoldable,
  isSeatSellable,
  generateTicketCode,
} from './booking-rules.js';

describe('BookingRules (Domain)', () => {
  describe('SEAT_HOLD_DURATION_MS', () => {
    it('should hold seats for 11 minutes (660,000 ms) to exceed the 10-minute order timeout', () => {
      expect(SEAT_HOLD_DURATION_MS).toBe(11 * 60 * 1000);
      expect(SEAT_HOLD_DURATION_MS).toBe(660000);
    });
  });

  describe('isShowtimeHoldable', () => {
    it('should allow holding seats for OPEN or SCHEDULED showtimes', () => {
      expect(isShowtimeHoldable('OPEN')).toBe(true);
      expect(isShowtimeHoldable('SCHEDULED')).toBe(true);
    });

    it('should disallow holding seats for CANCELLED, COMPLETED, or other statuses', () => {
      expect(isShowtimeHoldable('CANCELLED')).toBe(false);
      expect(isShowtimeHoldable('COMPLETED')).toBe(false);
      expect(isShowtimeHoldable('CLOSED')).toBe(false);
      expect(isShowtimeHoldable('')).toBe(false);
      expect(isShowtimeHoldable('UNKNOWN')).toBe(false);
    });
  });

  describe('isSeatSellable', () => {
    it('should return true only when seat physical status is ACTIVE', () => {
      expect(isSeatSellable('ACTIVE')).toBe(true);
    });

    it('should return false when seat status is BROKEN, MAINTENANCE, or INACTIVE', () => {
      expect(isSeatSellable('MAINTENANCE')).toBe(false);
      expect(isSeatSellable('BROKEN')).toBe(false);
      expect(isSeatSellable('INACTIVE')).toBe(false);
      expect(isSeatSellable('')).toBe(false);
    });
  });

  describe('generateTicketCode', () => {
    it('should generate a code in the format TKT-YYYYMMDD-XXXXXX', () => {
      const fixedDate = new Date('2026-10-27T08:00:00.000Z');
      const ticketCode = generateTicketCode(fixedDate);

      expect(ticketCode).toMatch(/^TKT-20261027-[A-Z0-9]{6}$/);
    });

    it('should generate unique codes on consecutive invocations', () => {
      const code1 = generateTicketCode();
      const code2 = generateTicketCode();
      expect(code1).not.toBe(code2);
    });
  });
});

