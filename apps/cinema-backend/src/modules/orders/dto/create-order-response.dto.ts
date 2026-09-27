import { Expose, Type, Transform } from 'class-transformer';

class OrderPricingDto {
  @Expose()
  @Transform(({ value }) => Number(value))
  subtotalTickets: number;

  @Expose()
  @Transform(({ value }) => Number(value))
  subtotalFnb: number;

  @Expose()
  @Transform(({ value }) => Number(value))
  discountAmount: number;

  @Expose()
  @Transform(({ value }) => Number(value))
  finalAmount: number;
}

export class OrderCreatedResponseDto {
  @Expose()
  @Transform(({ value }) => Number(value))
  orderId: number;

  @Expose()
  orderCode: string;

  @Expose()
  @Transform(({ value }) => Number(value))
  showtimeId: number;

  @Expose()
  seatIds: number[];

  @Expose()
  channel: string;

  @Expose()
  @Type(() => OrderPricingDto)
  pricing: OrderPricingDto;

  @Expose()
  status: string;

  @Expose()
  expiresAt: Date;

  @Expose()
  createdAt: Date;
}
