/**
 * Đơn hàng đang chờ thanh toán, lưu lại trước khi chuyển sang VNPay.
 * VNPay chỉ trả về txnRef nên trang kết quả cần biết orderId để tra cứu.
 */
export interface PendingOrder {
  orderId: number;
  orderCode: string;
  showtimeId: number;
  /** Hạn thanh toán của đơn (epoch ms) */
  expiresAt: number;
  /** Chữ ký nội dung đơn, để biết giỏ hàng có bị thay đổi không */
  signature: string;
}

export const PENDING_ORDER_KEY = "cinema_pending_order_v1";

export function loadPendingOrder(): PendingOrder | null {
  try {
    const raw = sessionStorage.getItem(PENDING_ORDER_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<PendingOrder>;
    if (
      typeof data.orderId !== "number" ||
      typeof data.expiresAt !== "number" ||
      typeof data.signature !== "string"
    ) {
      return null;
    }
    return data as PendingOrder;
  } catch {
    return null;
  }
}

export function savePendingOrder(order: PendingOrder): void {
  try {
    sessionStorage.setItem(PENDING_ORDER_KEY, JSON.stringify(order));
  } catch {
    // Bỏ qua lỗi storage
  }
}

export function clearPendingOrder(): void {
  try {
    sessionStorage.removeItem(PENDING_ORDER_KEY);
  } catch {
    // Bỏ qua lỗi storage
  }
}
