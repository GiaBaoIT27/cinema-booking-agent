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
  /** URL cổng thanh toán để mở trong trình duyệt */
  paymentUrl: string;
}
