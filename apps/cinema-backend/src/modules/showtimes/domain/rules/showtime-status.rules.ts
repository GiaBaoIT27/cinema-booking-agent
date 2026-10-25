import { ShowtimeStatus } from '../enums/showtime-status.enum.js';

/** Ma trận trạng thái hợp lệ có thể chuyển đến từ trạng thái hiện tại. */

const ALLOWED_STATUS_TRANSITIONS: Record<
  ShowtimeStatus,
  readonly ShowtimeStatus[]
> = {
  [ShowtimeStatus.SCHEDULED]: [ShowtimeStatus.OPEN, ShowtimeStatus.CANCELLED],
  [ShowtimeStatus.OPEN]: [ShowtimeStatus.CLOSED, ShowtimeStatus.CANCELLED],
  [ShowtimeStatus.CLOSED]: [], // CLOSED là trạng thái kết thúc, không thể chuyển đổi
  [ShowtimeStatus.CANCELLED]: [], // CANCELLED là trạng thái kết thúc, không thể chuyển đổi
};

export function canTransitionStatus(
  from: ShowtimeStatus,
  to: ShowtimeStatus,
): boolean {
  return ALLOWED_STATUS_TRANSITIONS[from].includes(to);
}
