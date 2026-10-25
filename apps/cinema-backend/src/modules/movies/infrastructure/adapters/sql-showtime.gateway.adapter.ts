import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type { IShowtimeGateway } from '../../domain/ports/showtime.gateway.port.js';

/**
 * Adapter read-only DUY NHẤT của movies sang bảng `showtimes`: một câu COUNT
 * chặn xóa phim còn suất chiếu. Movies không thể import ShowtimesModule
 * (vòng phụ thuộc Showtimes → Movies) nên phải giữ SQL tại đây.
 *
 * Mọi đọc chi tiết suất chiếu đã chuyển sang ShowtimesModule.
 */
@Injectable()
export class SqlShowtimeGatewayAdapter implements IShowtimeGateway {
  constructor(private readonly dataSource: DataSource) {}

  async countUpcomingByMovie(movieId: string): Promise<number> {
    const rows: { count: number }[] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS count
       FROM showtimes
       WHERE movie_id = $1 AND start_time >= CURRENT_TIMESTAMP`,
      [movieId],
    );
    return rows[0]?.count ?? 0;
  }
}
