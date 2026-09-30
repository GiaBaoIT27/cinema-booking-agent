import type { UserRegisteredEventPayload } from '#src/common/events/index.js';
import type { NotificationContent } from '../notification.types.js';
import {
  buildButtonHtml,
  escapeHtml,
  singleLine,
  wrapEmailLayout,
  type TemplateContext,
} from './template.util.js';

export function renderWelcome(
  payload: UserRegisteredEventPayload,
  ctx: TemplateContext,
): NotificationContent {
  const bodyHtml =
    `<p>Xin chào <strong>${escapeHtml(payload.fullName)}</strong>,</p>` +
    `<p>Tài khoản của bạn tại ${escapeHtml(ctx.brandName)} đã được tạo thành công. ` +
    `Bạn có thể bắt đầu đặt vé, chọn ghế và tích điểm thành viên ngay bây giờ.</p>` +
    buildButtonHtml('Khám phá phim đang chiếu', ctx.webBaseUrl);

  return {
    subject: singleLine(
      `Chào mừng ${payload.fullName} đến với ${ctx.brandName}`,
    ),
    text: [
      `Xin chào ${payload.fullName},`,
      '',
      `Tài khoản của bạn tại ${ctx.brandName} đã được tạo thành công.`,
      `Bắt đầu đặt vé tại: ${ctx.webBaseUrl}`,
    ].join('\n'),
    html: wrapEmailLayout(ctx, 'Chào mừng bạn!', bodyHtml),
    shortText: `${ctx.brandName}: chào mừng ${payload.fullName}! Tài khoản đã được tạo thành công.`,
  };
}
