import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

import { EventNames } from '#src/common/constants/event-names.constant.js';
import { RedisService } from '#src/core/redis/redis.service.js';
import type { CineplexDeactivatedEvent } from '#modules/cinemas/domain/events/cineplex-deactivated.event.js';
import type { AuditoriumDeactivatedEvent } from '#modules/cinemas/domain/events/auditorium-deactivated.event.js';

import {
  SHOWTIME_REPOSITORY,
  type IShowtimeRepository,
} from '../../domain/repositories/showtime.repository.interface.js';
import { ShowtimeStatus } from '../../domain/enums/showtime-status.enum.js';
import { ShowtimeCancelledEvent } from '../../domain/events/showtime-cancelled.event.js';
import { SHOWTIME_REDIS_KEYS } from '../../infrastructure/constants/showtime-redis.constant.js';

/**
 * Lắng nghe sự kiện vô hiệu hóa phòng/cụm rạp từ module cinemas →
 * tự hủy suất chiếu bằng repository + cache của CHÍNH module showtimes
 * (thay cho việc cinemas UPDATE thẳng bảng showtimes trước đây).
 *
 * Chạy SAU KHI transaction của cinemas đã commit (eventual consistency):
 * nếu listener lỗi, cinemas vẫn commit thành công — lỗi được log để retry/audit.
 */
@Injectable()
export class OnCinemaVenueDeactivatedHandler {
  private readonly logger = new Logger(OnCinemaVenueDeactivatedHandler.name);

  constructor(
    @Inject(SHOWTIME_REPOSITORY)
    private readonly showtimeRepository: IShowtimeRepository,
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Cụm rạp CLOSED/MAINTENANCE → hủy suất đang OPEN (giữ nguyên hành vi cũ). */
  @OnEvent(EventNames.CINEPLEX_DEACTIVATED)
  async handleCineplexDeactivated(event: CineplexDeactivatedEvent) {
    await this.cancelUpcoming(
      event.auditoriumIds,
      [ShowtimeStatus.OPEN],
      `cụm rạp ${event.cineplexId}`,
      event.reason,
    );
  }

  /** Phòng MAINTENANCE/INACTIVE → hủy suất SCHEDULED + OPEN (giữ nguyên hành vi cũ). */
  @OnEvent(EventNames.AUDITORIUM_DEACTIVATED)
  async handleAuditoriumDeactivated(event: AuditoriumDeactivatedEvent) {
    await this.cancelUpcoming(
      [event.auditoriumId],
      [ShowtimeStatus.SCHEDULED, ShowtimeStatus.OPEN],
      `phòng chiếu ${event.auditoriumId}`,
      event.reason,
    );
  }

  private async cancelUpcoming(
    auditoriumIds: string[],
    statuses: ShowtimeStatus[],
    cancelledBy: string,
    reason: string | null,
  ): Promise<void> {
    if (auditoriumIds.length === 0) return;

    try {
      const cancelledIds =
        await this.showtimeRepository.cancelUpcomingByAuditoriums(
          auditoriumIds,
          statuses,
        );
      if (cancelledIds.length === 0) return;

      // Invalidate cache của CHÍNH module showtimes (namespace cinema:showtimes:*)
      await this.redisService.delByPattern(SHOWTIME_REDIS_KEYS.PATTERN_ALL);

      this.logger.warn(
        `Đã hủy ${cancelledIds.length} suất chiếu tương lai do ${cancelledBy} ngừng hoạt động`,
      );

      // Phát tiếp cho payments/notifications/bookings (hoàn tiền, gửi thông báo…)
      this.eventEmitter.emit(
        EventNames.SHOWTIME_CANCELLED,
        new ShowtimeCancelledEvent(cancelledIds, cancelledBy, reason),
      );
    } catch (error) {
      // Best-effort: status của cinemas đã commit — không để lỗi listener
      // làm fail request của module cinemas.
      this.logger.error(
        `Không hủy được suất chiếu khi ${cancelledBy} ngừng hoạt động`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
