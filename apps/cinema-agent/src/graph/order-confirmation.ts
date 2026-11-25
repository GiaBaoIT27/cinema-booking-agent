/**
 * Xác nhận trước khi tạo đơn – quy tắc được thực thi bằng CODE thay vì chỉ dựa vào prompt.
 *
 * Lời gọi create_order_and_payment chỉ thật sự tạo đơn khi:
 *   (a) khách đã thấy thẻ xác nhận với tổng tiền DO BACKEND TÍNH (POST /orders/preview), và
 *   (b) khách đã xác nhận: bấm nút "Xác nhận" trên thẻ (xử lý trong order-actions.ts, không
 *       qua mô hình), HOẶC gửi một tin nhắn xác nhận rõ ràng SAU khi thẻ hiện ra và mô hình gọi
 *       lại với ĐÚNG các tham số đã xem trước.
 * Mọi lời gọi khác chỉ tạo (hoặc làm mới) thẻ xác nhận – không tạo đơn, không gắn ghế.
 */

export interface OrderArgs {
  showtimeId: number;
  seatLabels: string[];
  fnbItems?: Array<{ fnbItemId: number; quantity: number }>;
  voucherCode?: string;
}

export interface PendingOrder {
  confirmationId: string;
  args: OrderArgs;
  /** Dữ liệu đã hiện trên thẻ (tổng tiền, ghế, bắp nước) */
  summary: Record<string, unknown>;
  /** Số tin nhắn trong hội thoại lúc thẻ hiện ra – tin nhắn của khách SAU mốc này mới tính */
  shownAt: number;
  /** Thời điểm hết hiệu lực (ISO) */
  expiresAt: string;
}

/** Thẻ xác nhận còn hiệu lực trong 10 phút (ghế giữ 11 phút) */
export const PENDING_ORDER_TTL_MS = 10 * 60 * 1000;

export interface MessageLike {
  content?: unknown;
  getType?: () => string;
  _getType?: () => string;
}

const kindOf = (m: MessageLike) =>
  m?.getType ? m.getType() : m?._getType ? m._getType() : "";

function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((p) =>
        p && typeof p === "object" && (p as { type?: string }).type === "text"
          ? String((p as { text?: unknown }).text ?? "")
          : "",
      )
      .join(" ");
  }
  return "";
}

/** Bỏ dấu tiếng Việt, viết thường, gộp khoảng trắng */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CONFIRM = /\b(xac nhan|dong y|chot|ok|oke|okay|okie|yes|confirm|dat luon|tao don|thanh toan|duoc roi|lam di|lay luon)\b/;
const NEGATIVE = /\b(khong|ko|chua|huy|thoi|doi|khoan|dung|bo|sai|nham|no|cancel)\b/;

/** Tin nhắn có phải lời xác nhận rõ ràng (có từ xác nhận, không có từ phủ định/đổi ý) */
export function isConfirmationText(text: string): boolean {
  const t = ` ${normalize(text)} `;
  return CONFIRM.test(t) && !NEGATIVE.test(t);
}

/** Chuẩn hóa tham số để so sánh: ghế viết hoa + sắp xếp, bắp nước sắp xếp, voucher viết hoa */
export function normalizeOrderArgs(a: OrderArgs) {
  return {
    showtimeId: Number(a.showtimeId),
    seatLabels: [...(a.seatLabels ?? [])].map((s) => s.trim().toUpperCase()).sort(),
    fnbItems: [...(a.fnbItems ?? [])]
      .filter((f) => f.quantity > 0)
      .map((f) => ({ fnbItemId: Number(f.fnbItemId), quantity: Number(f.quantity) }))
      .sort((x, y) => x.fnbItemId - y.fnbItemId),
    voucherCode: a.voucherCode?.trim() ? a.voucherCode.trim().toUpperCase() : null,
  };
}

export function sameOrderArgs(a: OrderArgs, b: OrderArgs): boolean {
  return JSON.stringify(normalizeOrderArgs(a)) === JSON.stringify(normalizeOrderArgs(b));
}

export function isPendingValid(p: PendingOrder | null | undefined, now: Date): p is PendingOrder {
  return Boolean(p) && new Date(p!.expiresAt).getTime() > now.getTime();
}

/**
 * Quyết định cho một lời gọi create_order_and_payment của mô hình:
 *  - "create": đúng đơn đã xem trước, còn hiệu lực, và tin nhắn mới nhất của khách (gửi SAU khi
 *    thẻ hiện ra) là lời xác nhận rõ ràng;
 *  - "preview": mọi trường hợp khác – chỉ hiện/làm mới thẻ xác nhận.
 */
export function decideOrderCall(
  pending: PendingOrder | null | undefined,
  args: OrderArgs,
  messages: MessageLike[],
  now: Date,
): "create" | "preview" {
  if (!isPendingValid(pending, now)) return "preview";
  if (!sameOrderArgs(pending.args, args)) return "preview";

  let lastHuman = -1;
  messages.forEach((m, i) => {
    if (kindOf(m) === "human") lastHuman = i;
  });
  if (lastHuman < pending.shownAt) return "preview";
  return isConfirmationText(textOf(messages[lastHuman]?.content)) ? "create" : "preview";
}
