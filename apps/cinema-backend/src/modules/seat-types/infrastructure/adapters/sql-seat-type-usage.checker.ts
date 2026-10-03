import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type { ISeatTypeUsageChecker } from '../../application/ports/seat-type-usage-checker.port.js';

/**
 * ⚠ Điểm DUY NHẤT trong module còn chạm vào dữ liệu của module khác (bảng `seats`).
 * Được cô lập ở đây để khi module `seats` có facade, chỉ cần thay file này
 * (VD: gọi SeatsFacade.existsBySeatTypeId) mà không động tới service.
 */
@Injectable()
export class SqlSeatTypeUsageChecker implements ISeatTypeUsageChecker {
  constructor(private readonly dataSource: DataSource) {}

  async isInUse(seatTypeId: string): Promise<boolean> {
    const [row] = await this.dataSource.query(
      'SELECT EXISTS (SELECT 1 FROM seats WHERE seat_type_id = $1) AS "exists"',
      [seatTypeId],
    );
    return row.exists === true;
  }
}
