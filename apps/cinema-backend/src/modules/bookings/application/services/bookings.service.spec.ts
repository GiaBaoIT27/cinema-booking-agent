import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpStatus } from '@nestjs/common';

import { BookingsService } from './bookings.service.js';
import type { ISeatInventory } from '../ports/seat-inventory.port.js';
import type { IShowtimeLookup } from '../ports/showtime-lookup.port.js';
import type { ISeatCatalog } from '../ports/seat-catalog.port.js';
import type { ISeatHoldStore } from '../ports/seat-hold-store.port.js';
import { ErrorCode } from '#src/common/constants/error-codes.enum.js';

describe('BookingsService.releaseSeats', () => {
  let inventory: ISeatInventory;
  let holdStore: ISeatHoldStore;
  let service: BookingsService;

  beforeEach(() => {
    inventory = {
      findActiveHolds: vi.fn().mockResolvedValue([]),
      findSeatIdsHeldByOthers: vi.fn().mockResolvedValue([]),
      releaseHolds: vi.fn().mockResolvedValue(undefined),
    } as unknown as ISeatInventory;
    holdStore = { release: vi.fn().mockResolvedValue(undefined) } as unknown as ISeatHoldStore;
    service = new BookingsService(
      inventory,
      {} as IShowtimeLookup,
      {} as ISeatCatalog,
      holdStore,
    );
  });

  it('nhả ghế đang giữ của chính user', async () => {
    vi.mocked(inventory.findActiveHolds).mockResolvedValue([
      { showtimeId: '7', seatId: '1', userId: 'u1', holdExpiresAt: new Date() },
    ]);

    const res = await service.releaseSeats('u1', { showtimeId: 7, seatIds: [1] } as any);

    expect(res.releasedSeatIds).toEqual([1]);
    expect(holdStore.release).toHaveBeenCalledWith('7', ['1'], 'u1');
    expect(inventory.releaseHolds).toHaveBeenCalledWith('7', ['1'], 'u1');
  });

  it('ghế đang do người khác giữ => 403 BOOKING_NOT_HELD, không thay đổi gì', async () => {
    vi.mocked(inventory.findSeatIdsHeldByOthers).mockResolvedValue(['1']);

    await expect(
      service.releaseSeats('u2', { showtimeId: 7, seatIds: [1] } as any),
    ).rejects.toMatchObject({
      errorCode: ErrorCode.BOOKING_NOT_HELD,
      status: HttpStatus.FORBIDDEN,
    });
    expect(holdStore.release).not.toHaveBeenCalled();
    expect(inventory.releaseHolds).not.toHaveBeenCalled();
  });

  it('ghế của mình đã hết hạn / đã trống => 200, danh sách rỗng (client bỏ chọn bình thường)', async () => {
    const res = await service.releaseSeats('u1', { showtimeId: 7, seatIds: [1] } as any);

    expect(res.releasedSeatIds).toEqual([]);
    expect(holdStore.release).not.toHaveBeenCalled();
  });
});
