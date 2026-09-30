import type { BookingExpiredEventPayload } from '#src/common/events/index.js';
import type { NotificationContent } from '../notification.types.js';
import {
  escapeHtml,
  wrapEmailLayout,
  type TemplateContext,
} from './template.util.js';

export function renderBookingExpired(
  payload: BookingExpiredEventPayload,
  ctx: TemplateContext,
): NotificationContent {
  const seats = payload.seatCodes.join(', ');
  const message = seats
    ? `Thời gian giữ ghế ${seats} đã hết. Vui lòng đặt lại nếu bạn vẫn muốn xem phim.`
    : `Thời gian giữ ghế đã hết. Vui lòng đặt lại nếu bạn vẫn muốn xem phim.`;

  return {
    subject: 'Ghế bạn đang giữ đã hết hạn',
    text: message,
    html: wrapEmailLayout(
      ctx,
      'Ghế đã được nhả',
      `<p>${escapeHtml(message)}</p>`,
    ),
    shortText: `${ctx.brandName}: ${message}`,
  };
}
