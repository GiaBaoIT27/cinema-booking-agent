/**
 * Integration test (Postgres THẬT): ràng buộc EXCLUDE chống trùng suất chiếu cùng phòng.
 * Bảng được tạo bằng synchronize từ entity (có @Exclusion), giống môi trường dev.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DataSource, Repository } from 'typeorm';

import { createIntegrationDataSource } from '#src/test-utils/integration-db.js';
import { Showtime } from '../../domain/entities/showtime.entity.js';
import { ShowtimeStatus } from '../../domain/enums/showtime-status.enum.js';

const at = (hhmm: string) => new Date(`2027-01-10T${hhmm}:00Z`);

describe('showtimes – ràng buộc chống trùng giờ trong cùng phòng (Postgres thật)', () => {
  let ds: DataSource;
  let repo: Repository<Showtime>;

  const insert = (auditoriumId: string, start: string, end: string, status = ShowtimeStatus.SCHEDULED) =>
    repo.insert({
      auditoriumId,
      movieId: '1',
      audioLanguage: 'Tiếng Việt',
      startTime: at(start),
      endTime: at(end),
      status,
    });

  beforeAll(async () => {
    ds = await createIntegrationDataSource();
    repo = ds.getRepository(Showtime);
  });

  afterAll(async () => {
    await ds?.destroy();
  });

  beforeEach(async () => {
    await ds.query('TRUNCATE showtimes RESTART IDENTITY CASCADE');
  });

  it('10 request tạo suất chồng giờ cùng lúc => đúng 1 thành công, còn lại lỗi 23P01', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) =>
        insert('1', `10:${String(i).padStart(2, '0')}`, `12:${String(i).padStart(2, '0')}`),
      ),
    );

    const ok = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(ok).toHaveLength(1);
    for (const r of rejected) {
      expect(r.reason?.driverError?.code ?? r.reason?.code).toBe('23P01');
    }
    expect(await repo.count()).toBe(1);
  });

  it('suất nối tiếp (kết thúc 12:00, suất sau bắt đầu 12:00) và phòng khác vẫn tạo được', async () => {
    await insert('1', '10:00', '12:00');
    await expect(insert('1', '12:00', '14:00')).resolves.toBeDefined();
    await expect(insert('2', '10:30', '12:30')).resolves.toBeDefined();
    expect(await repo.count()).toBe(3);
  });

  it('suất đã HỦY không chặn suất mới cùng giờ', async () => {
    await insert('1', '10:00', '12:00', ShowtimeStatus.CANCELLED);
    await expect(insert('1', '10:00', '12:00')).resolves.toBeDefined();
  });

  it('không đổi được giờ một suất để chồng lên suất khác', async () => {
    await insert('1', '10:00', '12:00');
    const later = await insert('1', '13:00', '15:00');
    const id = later.identifiers[0].id as string;

    await expect(
      repo.update(id, { startTime: at('11:00'), endTime: at('13:00') }),
    ).rejects.toMatchObject({ driverError: { code: '23P01' } });
  });
});
