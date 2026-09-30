import type { OrderPaidEventPayload } from '#src/common/events/index.js';
import type { NotificationContent } from '../notification.types.js';
import {
  buildButtonHtml,
  buildDetailRowsHtml,
  escapeHtml,
  formatDateTime,
  formatShortDateTime,
  formatVnd,
  singleLine,
  wrapEmailLayout,
  type TemplateContext,
} from './template.util.js';

export function renderTicketConfirmation(
  payload: OrderPaidEventPayload,
  ctx: TemplateContext,
): NotificationContent {
  const orderUrl = `${ctx.webBaseUrl}/orders/${encodeURIComponent(payload.orderId)}`;
  const seats = payload.seats.join(', ');
  const fnb = payload.fnbItems
    .map((item) => `${item.name} x${item.quantity}`)
    .join(', ');

  const rows: Array<readonly [string, string]> = [
    ['Mã đơn hàng', payload.orderCode],
    ['Phim', payload.movieTitle],
    ['Rạp', `${payload.cineplexName} - ${payload.auditoriumName}`],
    ['Suất chiếu', formatDateTime(payload.startTime)],
    ['Ghế', seats],
  ];
  if (payload.fnbItems.length > 0) {
    rows.push(['Bắp nước', fnb]);
  }
  rows.push(['Tổng thanh toán', formatVnd(payload.totalAmount)]);

  const qrBlocks = payload.tickets
    .map(
      (ticket, index) =>
        `<div style="display:inline-block;margin:8px 12px 8px 0;text-align:center;">` +
        `<img src="cid:ticket-qr-${index}" width="160" height="160" alt="QR ${escapeHtml(ticket.ticketCode)}" />` +
        `<div style="font-size:12px;margin-top:4px;">Ghế ${escapeHtml(ticket.seatCode)}<br/>${escapeHtml(ticket.ticketCode)}</div>` +
        `</div>`,
    )
    .join('');

  const bodyHtml =
    `<p>Xin chào <strong>${escapeHtml(payload.customerName)}</strong>,</p>` +
    `<p>Thanh toán thành công. Dưới đây là thông tin vé của bạn:</p>` +
    buildDetailRowsHtml(rows) +
    `<p style="margin:20px 0 4px;font-weight:bold;">Mã QR check-in (đưa cho nhân viên soát vé):</p>` +
    qrBlocks +
    buildButtonHtml('Xem vé trên website', orderUrl);

  const text = [
    `Xin chào ${payload.customerName},`,
    '',
    `Thanh toán đơn ${payload.orderCode} thành công. Thông tin vé của bạn:`,
    `- Phim: ${payload.movieTitle}`,
    `- Rạp: ${payload.cineplexName} - ${payload.auditoriumName}`,
    `- Suất chiếu: ${formatDateTime(payload.startTime)}`,
    `- Ghế: ${seats}`,
    ...(payload.fnbItems.length > 0 ? [`- Bắp nước: ${fnb}`] : []),
    `- Tổng thanh toán: ${formatVnd(payload.totalAmount)}`,
    '',
    ...payload.tickets.map((t) => `Ghế ${t.seatCode}: mã vé ${t.ticketCode}`),
    '',
    `Xem vé và mã QR: ${orderUrl}`,
  ].join('\n');

  return {
    subject: singleLine(
      `[${ctx.brandName}] Vé phim ${payload.movieTitle} - đơn ${payload.orderCode}`,
    ),
    text,
    html: wrapEmailLayout(ctx, 'Đặt vé thành công', bodyHtml),
    // Lưu ý: một số nhà mạng/brandname SMS yêu cầu nội dung không dấu.
    shortText: `${ctx.brandName}: đơn ${payload.orderCode} đã thanh toán. ${payload.movieTitle}, ${formatShortDateTime(payload.startTime)}, ghế ${seats}. Xem vé: ${orderUrl}`,
    inlineQrCodes: payload.tickets.map((ticket, index) => ({
      cid: `ticket-qr-${index}`,
      data: ticket.qrPayload,
    })),
  };
}
