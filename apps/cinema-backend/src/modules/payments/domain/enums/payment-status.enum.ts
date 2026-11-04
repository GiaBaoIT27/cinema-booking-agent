export enum PaymentStatus {
  INITIATED = 'INITIATED',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  /** Đã thu tiền nhưng không xuất được vé (đơn hết hạn/hủy, mất ghế, trả trùng) – chờ hoàn tiền. */
  REFUND_PENDING = 'REFUND_PENDING',
  REFUNDED = 'REFUNDED',
}

