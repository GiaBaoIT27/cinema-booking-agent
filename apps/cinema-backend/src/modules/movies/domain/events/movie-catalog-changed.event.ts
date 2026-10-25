import { BaseDomainEvent } from '#src/common/domain/domain-event.base.js';
import { EventNames } from '#src/common/constants/event-names.constant.js';

export type MovieCatalogChangeReason =
  'CREATED' | 'UPDATED' | 'STATUS_CHANGED' | 'GENRES_CHANGED' | 'DELETED';

/**
 * Domain event bắn ra SAU KHI dữ liệu một bộ phim thay đổi (thêm/sửa/đổi trạng thái/đổi thể loại/xóa).
 * Listener hiện có: module genres → xóa cache "số phim / danh sách phim theo thể loại".
 * Module khác (showtimes...) có thể lắng nghe cùng tên event mà không phải sửa movies.
 */
export class MovieCatalogChangedEvent extends BaseDomainEvent {
  public readonly aggregateId: string;

  constructor(
    /** ID của phim bị thay đổi */
    public readonly movieId: string,
    public readonly reason: MovieCatalogChangeReason,
  ) {
    super();
    this.aggregateId = movieId;
  }

  getEventName(): string {
    return EventNames.MOVIE_CATALOG_CHANGED;
  }
}
