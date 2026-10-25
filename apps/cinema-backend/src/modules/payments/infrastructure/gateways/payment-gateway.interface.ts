export interface CreatePaymentUrlParams {
  orderId: string | number;
  orderCode: string;
  amount: number;
  orderInfo: string;
  ipAddress?: string;
  returnUrl?: string;
}

export interface VerifyIpnResult {
  isValid: boolean;
  isSuccess: boolean;
  orderId: string;
  gatewayTxnRef: string;
  transactionNo: string | null;
  amount: number;
  responseCode: string;
  message: string;
  rawPayload: Record<string, any>;
}

export interface RefundParams {
  orderId: string | number;
  gatewayTxnRef: string;
  amount: number;
  transactionNo?: string;
  reason?: string;
}

export interface RefundResult {
  success: boolean;
  responseCode: string;
  message: string;
  rawPayload?: Record<string, any>;
}

export interface IPaymentGateway {
  createPaymentUrl(params: CreatePaymentUrlParams): Promise<string>;
  verifyIpn(query: Record<string, any>): Promise<VerifyIpnResult>;
  refund(params: RefundParams): Promise<RefundResult>;
}

