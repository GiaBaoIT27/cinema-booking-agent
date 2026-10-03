export class SeatTypeSummaryDto {
  id: string;
  code: string;
  name: string;
  priceMultiplier: number;
  surchargeAmount: number;
  colorCode: string;
  seatCount: number;
  description: string | null;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
