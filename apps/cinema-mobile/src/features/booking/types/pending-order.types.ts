/**
 * Đơn đang chờ thanh toán. Lưu để thử lại không tạo đơn trùng và để hiển thị nhãn ghế
 * (chi tiết đơn của backend chỉ có seatId).
 */
export interface PendingOrder {
  orderId: number;
  orderCode: string;
  showtimeId: number;
  /** Hạn thanh toán của đơn (epoch ms) */
  expiresAt: number;
  /** Chữ ký nội dung giỏ: ghế, món, voucher đổi thì chữ ký đổi */
  signature: string;
  /** seatId → nhãn ghế */
  seatLabels: Record<number, string>;
}
