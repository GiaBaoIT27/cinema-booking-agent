export type PaymentMethod = "VNPAY" | "MOMO" | "ZALOPAY" | "CASH" | "CARD";

/** Body của POST /payments/initiate */
export interface InitiatePaymentPayload {
  orderId: number;
  method: PaymentMethod;
  returnUrl?: string;
}

/** POST /payments/initiate */
export interface PaymentSession {
  orderId: number;
  orderCode: string;
  gatewayTxnRef: string;
  amount: number;
  /** URL cổng thanh toán, trình duyệt cần chuyển hướng tới đây */
  paymentUrl: string;
}

/** Query backend gắn vào /payment-result sau khi VNPay redirect về */
export type PaymentResultStatus = "success" | "failed";
