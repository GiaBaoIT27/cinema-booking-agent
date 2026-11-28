import { describe, it, expect } from 'vitest';
import { showtimeListQueryKey } from './showtime-list-cache-key.js';

describe('showtimeListQueryKey', () => {
  const base = { date: '2026-12-01', page: 1, limit: 20 };

  it('khác bộ lọc thì khác key (không trả nhầm cache)', () => {
    const keys = new Set([
      showtimeListQueryKey(base),
      showtimeListQueryKey({ ...base, status: 'OPEN' }),
      showtimeListQueryKey({ ...base, status: 'CANCELLED' }),
      showtimeListQueryKey({ ...base, cineplexId: 1 }),
      showtimeListQueryKey({ ...base, movieId: 1 }),
      showtimeListQueryKey({ ...base, projectionType: 'IMAX' }),
      showtimeListQueryKey({ ...base, page: 2 }),
      showtimeListQueryKey({ ...base, date: '2026-12-02' }),
    ]);
    expect(keys.size).toBe(8);
  });

  it('cùng bộ lọc thì cùng key', () => {
    expect(showtimeListQueryKey({ ...base, cineplexId: '3' })).toBe(
      showtimeListQueryKey({ ...base, cineplexId: 3 }),
    );
  });
});
