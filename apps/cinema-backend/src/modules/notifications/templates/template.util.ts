export interface TemplateContext {
  brandName: string;
  webBaseUrl: string;
}

/** BẮT BUỘC escape mọi dữ liệu do người dùng/admin nhập trước khi nhúng vào HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Chặn xuống dòng trong subject để không bị chèn header. */
export function singleLine(value: string): string {
  return value.replace(/[\r\n\u2028\u2029]+/g, ' ').trim();
}

export function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(iso));
}

export function formatShortDateTime(iso: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso));
}

export function buildDetailRowsHtml(rows: ReadonlyArray<readonly [string, string]>): string {
  const body = rows
    .map(
      ([label, value]) =>
        `<tr>` +
        `<td style="padding:6px 12px 6px 0;color:#6b7280;vertical-align:top;white-space:nowrap;">${escapeHtml(label)}</td>` +
        `<td style="padding:6px 0;font-weight:bold;">${escapeHtml(value)}</td>` +
        `</tr>`,
    )
    .join('');
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;font-size:14px;">${body}</table>`;
}

export function buildButtonHtml(label: string, url: string): string {
  return (
    `<p style="margin:24px 0 0;">` +
    `<a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 20px;background:#dc2626;color:#ffffff;` +
    `text-decoration:none;border-radius:6px;font-weight:bold;">${escapeHtml(label)}</a>` +
    `</p>`
  );
}

export function wrapEmailLayout(ctx: TemplateContext, title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="vi">
<body style="margin:0;padding:24px;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2933;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;">
    <tr><td style="padding:20px 24px;background:#111827;color:#ffffff;font-size:20px;font-weight:bold;border-radius:8px 8px 0 0;">${escapeHtml(ctx.brandName)}</td></tr>
    <tr><td style="padding:24px;">
      <h2 style="margin:0 0 16px;font-size:18px;">${escapeHtml(title)}</h2>
      ${bodyHtml}
    </td></tr>
    <tr><td style="padding:16px 24px;font-size:12px;color:#6b7280;">Email được gửi tự động, vui lòng không trả lời trực tiếp.</td></tr>
  </table>
</body>
</html>`;
}
