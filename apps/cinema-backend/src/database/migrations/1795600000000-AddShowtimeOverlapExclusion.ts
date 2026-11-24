import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Chặn ở tầng database hai suất chiếu chưa hủy cùng phòng bị giao nhau về thời gian.
 *
 * Kiểm tra trong ứng dụng (ShowtimeSchedulingService.assertNoOverlapping) là "đọc rồi ghi":
 * hai request đồng thời có thể cùng qua bước kiểm tra. Ràng buộc EXCLUDE làm cho bản ghi
 * thứ hai bị từ chối (mã lỗi 23P01). int8range(a, a, '[]') giao nhau <=> cùng auditorium_id,
 * nên chỉ cần GiST có sẵn, không phải cài extension btree_gist.
 */
export class AddShowtimeOverlapExclusion1795600000000 implements MigrationInterface {
  name = 'AddShowtimeOverlapExclusion1795600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Dữ liệu cũ đã trùng giờ => dừng và báo rõ, không tự hủy suất chiếu thay người vận hành
    const clashes: Array<{ a: string; b: string; auditorium_id: string }> =
      await queryRunner.query(
        `SELECT a.id AS a, b.id AS b, a.auditorium_id
           FROM showtimes a
           JOIN showtimes b
             ON a.auditorium_id = b.auditorium_id AND a.id < b.id
            AND a.start_time < b.end_time AND b.start_time < a.end_time
          WHERE a.status <> 'CANCELLED' AND b.status <> 'CANCELLED'
          LIMIT 20`,
      );
    if (clashes.length > 0) {
      const list = clashes
        .map((c) => `${c.a}/${c.b} (phòng ${c.auditorium_id})`)
        .join(', ');
      throw new Error(
        `Không thể thêm ràng buộc chống trùng suất chiếu: đang có suất trùng giờ ${list}. ` +
          `Hủy (status = 'CANCELLED') hoặc dời một suất trong mỗi cặp rồi chạy lại migration.`,
      );
    }

    await queryRunner.query(
      `ALTER TABLE "showtimes" ADD CONSTRAINT "EXCL_showtimes_auditorium_schedule" EXCLUDE USING gist (int8range("auditorium_id", "auditorium_id", '[]') WITH &&, tsrange("start_time", "end_time", '[)') WITH &&) WHERE ("status" <> 'CANCELLED')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "showtimes" DROP CONSTRAINT "EXCL_showtimes_auditorium_schedule"`,
    );
  }
}
