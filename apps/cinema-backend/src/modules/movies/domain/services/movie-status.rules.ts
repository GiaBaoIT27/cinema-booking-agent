import { MovieStatus } from '../enums/movie-status.enum.js';

/** Ma trận trạng thái hợp lệ có thể chuyển đến từ trạng thái hiện tại. */
const ALLOWED_STATUS_TRANSITIONS: Record<MovieStatus, readonly MovieStatus[]> =
  {
    [MovieStatus.UPCOMING]: [MovieStatus.SHOWING, MovieStatus.ENDED],
    [MovieStatus.SHOWING]: [MovieStatus.ENDED],
    // ENDED là trạng thái cuối, không thể chuyển sang trạng thái khác
    [MovieStatus.ENDED]: [],
  };

export function canTransitionStatus(
  from: MovieStatus,
  to: MovieStatus,
): boolean {
  return ALLOWED_STATUS_TRANSITIONS[from].includes(to);
}
