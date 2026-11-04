/**
 * Integration test chống bán trùng ghế trên Postgres thật.
 * Chạy: npm run test:int   (cần Postgres; dùng DB riêng TEST_DB_NAME, mặc định `cinema_test`).
 *
 * Bảng được tạo bằng synchronize trên DB test; khóa ngoại được tắt trong phiên
 * (session_replication_role=replica) để không phải seed phim/rạp/phòng chiếu.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';

import { createIntegrationDataSource } from '#src/test-utils/integration-db.js';

import { ShowtimeSeat } from '../../domain/entities/showtime-seat.entity.js';
import { ShowtimeSeatStatus } from '../../domain/enums/showtime-seat-status.js';
import { TypeOrmShowtimeSeatRepository } from './typeorm-showtime-seat.repository.js';
import { Ticket } from '#modules/orders/domain/entities/ticket.entity.js';
import { TicketStatus } from '#modules/orders/domain/enums/ticket-status.enum.js';

const MIN = 60 * 1000;
const SHOWTIME = '1';
const at = (base: Date, minutes: number) => new Date(base.getTime() + minutes * MIN);

describe('TypeOrmShowtimeSeatRepository (Postgres thật) – chống bán trùng ghế', () => {
  let ds: DataSource;
  let repo: TypeOrmShowtimeSeatRepository;

  beforeAll(async () => {
    ds = await createIntegrationDataSource();
    repo = new TypeOrmShowtimeSeatRepository(ds.getRepository(ShowtimeSeat));
  });

  afterAll(async () => {
    await ds?.destroy();
  });

  beforeEach(async () => {
    await ds.query('TRUNCATE showtime_seats, tickets');
  });

  const row = (seatId: string) =>
    ds.getRepository(ShowtimeSeat).findOneByOrFail({ showtimeId: SHOWTIME, seatId });

  describe('tryHold', () => {
    it('50 user cùng giữ 1 ghế đồng thời => đúng 1 người thành công', async () => {
      const now = new Date();
      const results = await Promise.all(
        Array.from({ length: 50 }, (_, i) =>
          repo.tryHold(SHOWTIME, ['101'], String(1000 + i), at(now, 11), now),
        ),
      );

      expect(results.filter(Boolean)).toHaveLength(1);
      const winner = String(1000 + results.indexOf(true));
      expect(await row('101')).toMatchObject({
        status: ShowtimeSeatStatus.HOLDING,
        userId: winner,
      });
    });

    it('nhiều user tranh các bộ ghế chồng nhau => không ghế nào có 2 chủ, không ai giữ được một nửa', async () => {
      const now = new Date();
      const requests = Array.from({ length: 30 }, (_, i) => ({
        userId: String(2000 + i),
        // các bộ ghế trượt, chồng lấn nhau: [i, i+1, i+2] mod 10
        seatIds: [0, 1, 2].map((k) => String(200 + ((i + k) % 10))),
      }));

      const results = await Promise.all(
        requests.map((r) => repo.tryHold(SHOWTIME, r.seatIds, r.userId, at(now, 11), now)),
      );

      const rows = await ds.getRepository(ShowtimeSeat).findBy({ showtimeId: SHOWTIME });
      const ownerBySeat = new Map(rows.map((r) => [r.seatId, r.userId]));
      requests.forEach((r, i) => {
        const owned = r.seatIds.filter((s) => ownerBySeat.get(s) === r.userId).length;
        // all-or-nothing: hoặc giữ đủ 3 ghế, hoặc không giữ ghế nào
        expect(owned).toBe(results[i] ? 3 : 0);
      });
    });

    it('không giữ được ghế đã BOOKED', async () => {
      const now = new Date();
      await repo.tryHold(SHOWTIME, ['301'], '11', at(now, 11), now);
      await repo.claimForOrder(SHOWTIME, ['301'], '11', 'ORD-A', at(now, 15), now);
      await repo.markBooked(SHOWTIME, ['301'], 'ORD-A');

      expect(await repo.tryHold(SHOWTIME, ['301'], '12', at(now, 11), at(now, 60))).toBe(false);
    });

    it('giữ lại được ghế HOLDING đã hết hạn và chưa gắn đơn', async () => {
      const now = new Date();
      await repo.tryHold(SHOWTIME, ['401'], '11', at(now, 11), now);

      const later = at(now, 12);
      expect(await repo.tryHold(SHOWTIME, ['401'], '12', at(later, 11), later)).toBe(true);
      expect((await row('401')).userId).toBe('12');
    });
  });

  describe('Kịch bản lỗi cũ: A tạo đơn ở phút thứ 9 của lượt giữ ghế', () => {
    it('B không thể lấy ghế trong lúc đơn của A còn PENDING, A vẫn chốt được', async () => {
      const t0 = new Date();
      expect(await repo.tryHold(SHOWTIME, ['501', '502'], '11', at(t0, 11), t0)).toBe(true);

      // Phút 9: A tạo đơn, hạn đơn = phút 19, ghế được gia hạn tới phút 24
      const t9 = at(t0, 9);
      expect(
        await repo.claimForOrder(SHOWTIME, ['501', '502'], '11', 'ORD-A', at(t9, 15), t9),
      ).toBe(true);

      // Phút 12: hạn giữ ban đầu (phút 11) đã qua, khóa Redis của A coi như mất
      const t12 = at(t0, 12);
      expect(await repo.tryHold(SHOWTIME, ['501'], '12', at(t12, 11), t12)).toBe(false);

      // Job dọn hold hết hạn chạy ở phút 12 KHÔNG được nhả ghế của A
      await repo.releaseExpiredHolds(t12);
      expect((await row('501')).status).toBe(ShowtimeSeatStatus.HOLDING);

      // Phút 15: A thanh toán xong
      expect(await repo.markBooked(SHOWTIME, ['501', '502'], 'ORD-A')).toBe(true);
      expect((await row('501')).status).toBe(ShowtimeSeatStatus.BOOKED);
    });

    it('một lượt giữ ghế không thể dùng cho 2 đơn (2 request tạo đơn song song)', async () => {
      const now = new Date();
      await repo.tryHold(SHOWTIME, ['601', '602'], '11', at(now, 11), now);

      const [first, second] = await Promise.all([
        repo.claimForOrder(SHOWTIME, ['601', '602'], '11', 'ORD-1', at(now, 15), now),
        repo.claimForOrder(SHOWTIME, ['601', '602'], '11', 'ORD-2', at(now, 15), now),
      ]);

      expect([first, second].filter(Boolean)).toHaveLength(1);
      const winner = first ? 'ORD-1' : 'ORD-2';
      const loser = first ? 'ORD-2' : 'ORD-1';
      expect(await repo.markBooked(SHOWTIME, ['601', '602'], loser)).toBe(false);
      expect(await repo.markBooked(SHOWTIME, ['601', '602'], winner)).toBe(true);
    });

    it('user không tự nhả được ghế đã gắn đơn qua API release', async () => {
      const now = new Date();
      await repo.tryHold(SHOWTIME, ['701'], '11', at(now, 11), now);
      await repo.claimForOrder(SHOWTIME, ['701'], '11', 'ORD-A', at(now, 15), now);

      expect(await repo.releaseHolds(SHOWTIME, ['701'], '11')).toBe(0);
      expect((await row('701')).orderCode).toBe('ORD-A');
    });
  });

  describe('markBooked / releaseForOrder', () => {
    it('all-or-nothing: thiếu 1 ghế thì không ghế nào bị chốt', async () => {
      const now = new Date();
      await repo.tryHold(SHOWTIME, ['801', '802'], '11', at(now, 11), now);
      await repo.claimForOrder(SHOWTIME, ['801', '802'], '11', 'ORD-A', at(now, 15), now);
      // Ghế 802 bị nhả (VD: suất chiếu bị hủy rồi mở lại)
      await ds.query(
        `UPDATE showtime_seats SET status = 'AVAILABLE', order_code = NULL WHERE seat_id = 802`,
      );

      expect(await repo.markBooked(SHOWTIME, ['801', '802'], 'ORD-A')).toBe(false);
      expect((await row('801')).status).toBe(ShowtimeSeatStatus.HOLDING);
    });

    it('2 request chốt cùng một đơn song song (IPN lặp) => chỉ 1 thành công', async () => {
      const now = new Date();
      await repo.tryHold(SHOWTIME, ['901', '902'], '11', at(now, 11), now);
      await repo.claimForOrder(SHOWTIME, ['901', '902'], '11', 'ORD-A', at(now, 15), now);

      const results = await Promise.all(
        Array.from({ length: 5 }, () => repo.markBooked(SHOWTIME, ['901', '902'], 'ORD-A')),
      );
      expect(results.filter(Boolean)).toHaveLength(1);
    });

    it('hủy/hết hạn đơn KHÔNG bao giờ nhả ghế BOOKED, cũng không nhả ghế của đơn khác', async () => {
      const now = new Date();
      await repo.tryHold(SHOWTIME, ['1001'], '11', at(now, 11), now);
      await repo.claimForOrder(SHOWTIME, ['1001'], '11', 'ORD-A', at(now, 15), now);
      await repo.markBooked(SHOWTIME, ['1001'], 'ORD-A');
      await repo.tryHold(SHOWTIME, ['1002'], '12', at(now, 11), now);
      await repo.claimForOrder(SHOWTIME, ['1002'], '12', 'ORD-B', at(now, 15), now);

      await repo.releaseForOrder(SHOWTIME, ['1001', '1002'], 'ORD-X', '13');

      expect((await row('1001')).status).toBe(ShowtimeSeatStatus.BOOKED);
      expect((await row('1002'))).toMatchObject({
        status: ShowtimeSeatStatus.HOLDING,
        orderCode: 'ORD-B',
      });

      await repo.releaseForOrder(SHOWTIME, ['1002'], 'ORD-B', '12');
      expect((await row('1002')).status).toBe(ShowtimeSeatStatus.AVAILABLE);
    });
  });

  describe('tickets – unique index vé còn hiệu lực', () => {
    const ticket = (code: string, status: TicketStatus) =>
      ds.getRepository(Ticket).insert({
        orderId: '1',
        showtimeId: SHOWTIME,
        seatId: '1101',
        ticketCode: code,
        price: 100000,
        status,
      });

    it('không cho 2 vé VALID cùng ghế cùng suất chiếu', async () => {
      await ticket('TKT-1', TicketStatus.VALID);
      await expect(ticket('TKT-2', TicketStatus.VALID)).rejects.toThrow(/uq_tickets_showtime_seat_active/);
    });

    it('vé đã hủy không chặn việc bán lại ghế', async () => {
      await ticket('TKT-1', TicketStatus.CANCELLED);
      await expect(ticket('TKT-2', TicketStatus.VALID)).resolves.toBeDefined();
    });
  });
});
