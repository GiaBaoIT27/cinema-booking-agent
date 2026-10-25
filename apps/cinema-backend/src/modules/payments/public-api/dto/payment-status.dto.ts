export class PaymentStatusDto {
  orderId: string;
  status: string;
  method: string | null;
  amount: number;
  paidAt: Date | null;
  transactionRef: string | null;
}

