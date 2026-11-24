import { describe, it, expect, vi } from 'vitest';
import { HttpStatus } from '@nestjs/common';

import { ShowtimeSchedulingService } from './showtime-scheduling.service.js';
import type { IShowtimeRepository } from '../../domain/repositories/showtime.repository.interface.js';
import { ErrorCode } from '#src/common/constants/error-codes.enum.js';

const service = new ShowtimeSchedulingService({
  findOverlapping: vi.fn(),
} as unknown as IShowtimeRepository);

describe('ShowtimeSchedulingService.rethrowOverlapViolation', () => {
  it('lỗi EXCLUDE của Postgres (23P01) => 409 SHOWTIME_SCHEDULE_OVERLAP', () => {
    const dbError = { driverError: { code: '23P01' } };
    try {
      service.rethrowOverlapViolation(dbError);
      expect.unreachable();
    } catch (e: any) {
      expect(e.errorCode).toBe(ErrorCode.SHOWTIME_SCHEDULE_OVERLAP);
      expect(e.getStatus()).toBe(HttpStatus.CONFLICT);
    }
  });

  it('lỗi khác được ném lại nguyên vẹn', () => {
    const other = new Error('connection lost');
    expect(() => service.rethrowOverlapViolation(other)).toThrow(other);
  });
});

describe('ShowtimeSchedulingService.assertNoOverlapping', () => {
  it('có suất chồng giờ => 409, bỏ qua chính suất đang sửa', async () => {
    const repo = { findOverlapping: vi.fn().mockResolvedValue({ id: '9' }) };
    const s = new ShowtimeSchedulingService(repo as unknown as IShowtimeRepository);
    const start = new Date('2027-01-10T10:00:00Z');
    const end = new Date('2027-01-10T12:00:00Z');

    await expect(s.assertNoOverlapping('1', start, end, '5')).rejects.toMatchObject({
      errorCode: ErrorCode.SHOWTIME_SCHEDULE_OVERLAP,
    });
    expect(repo.findOverlapping).toHaveBeenCalledWith('1', start, end, '5');
  });
});
