import { BaseDomainEvent } from '#src/common/domain/domain-event.base.js';
import { EventNames } from '#src/common/constants/event-names.constant.js';

/**
 * Cụm rạp chuyển từ ACTIVE sang CLOSED/MAINTENANCE.
 * Phát SAU KHI transaction của cinemas đã commit — module showtimes lắng nghe
 * và tự hủy các suất OPEN chưa chiếu của các phòng thuộc cụm (sở hữu dữ liệu showtimes).
 */
export class CineplexDeactivatedEvent extends BaseDomainEvent {
  public readonly aggregateId: string;

  constructor(
    /** ID cụm rạp bị vô hiệu hóa */
    public readonly cineplexId: string,
    /** Danh sách phòng chiếu thuộc cụm — để listener không phải đụng bảng `auditoriums`. */
    public readonly auditoriumIds: string[],
    /** Lý do thay đổi trạng thái (nếu có) */
    public readonly reason: string | null,
  ) {
    super();
    this.aggregateId = cineplexId;
  }

  getEventName(): string {
    return EventNames.CINEPLEX_DEACTIVATED;
  }
}