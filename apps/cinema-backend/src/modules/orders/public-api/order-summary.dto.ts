export class OrderSummaryDto {
  id: number;
  orderCode: string;
  userId: string;
  showtimeId: number;
  status: string;
  paymentMethod: string | null;
  finalAmount: number;
  expiresAt: Date;
}
