/** Ảnh chụp trạng thái đơn hàng dùng cho luồng thanh toán (qua OrdersFacade). */
export interface OrderSnapshot {
  id: number;
  orderCode: string;
  userId: string;
  showtimeId: number;
  status: string;
  paymentMethod: string | null;
  finalAmount: number;
  expiresAt: Date;
}
