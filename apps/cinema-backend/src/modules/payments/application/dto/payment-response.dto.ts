export class PaymentResponseDto {
  orderId: number;
  orderCode: string;
  gatewayTxnRef: string;
  amount: number;
  paymentUrl: string;
}

