import { BaseDomainEvent } from '#src/common/domain/domain-event.base.js';
import { EventNames } from '#src/common/constants/event-names.constant.js';

/**
 * Phòng chiếu chuyển sang MAINTENANCE/INACTIVE.
 * Phát SAU KHI transaction của cinemas đã commit — module showtimes lắng nghe
 * và tự hủy các suất SCHEDULED/OPEN chưa chiếu của phòng này.
 */
export class AuditoriumDeactivatedEvent extends BaseDomainEvent {
  public readonly aggregateId: string;

  constructor(
    /** ID phòng chiếu bị vô hiệu hóa */
    public readonly auditoriumId: string,
    /** Lý do thay đổi trạng thái (nếu có) */
    public readonly reason: string | null,
  ) {
    super();
    this.aggregateId = auditoriumId;
  }

  getEventName(): string {
    return EventNames.AUDITORIUM_DEACTIVATED;
  }
}