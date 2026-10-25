import { BaseDomainEvent } from '#src/common/domain/domain-event.base.js';
import { EventNames } from '#src/common/constants/event-names.constant.js';

/**
 * Suất chiếu bị hủy hàng loạt (do phòng chiếu/cụm rạp ngừng hoạt động).
 * Phát SAU KHI các suất đã chuyển sang CANCELLED trong DB —
 * module khác (payments/notifications/bookings...) lắng nghe để hoàn tiền,
 * gửi thông báo hoặc giải phóng chỗ giữ.
 */
export class ShowtimeCancelledEvent extends BaseDomainEvent {
  public readonly aggregateId: string;

  constructor(
    /** Danh sách ID các suất vừa bị hủy */
    public readonly showtimeIds: string[],
    /** Nguồn gây ra việc hủy (mô tả ngắn, dùng để log/audit) */
    public readonly cancelledBy: string,
    /** Lý do thay đổi trạng thái (nếu có) */
    public readonly reason: string | null,
  ) {
    super();
    this.aggregateId = showtimeIds[0] ?? '';
  }

  getEventName(): string {
    return EventNames.SHOWTIME_CANCELLED;
  }
}

