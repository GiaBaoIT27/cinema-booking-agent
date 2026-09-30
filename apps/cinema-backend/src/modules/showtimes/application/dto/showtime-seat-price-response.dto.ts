import { Expose, Type } from 'class-transformer';

export class SeatPriceItemDto {
  @Expose()
  seatTypeId: number;

  @Expose()
  seatTypeCode: string;

  @Expose()
  seatTypeName: string;

  @Expose()
  priceMultiplier: number;

  @Expose()
  surchargeAmount: number;

  @Expose()
  finalPrice: number;

  @Expose()
  isOverridden: boolean;

  @Expose()
  updatedAt: Date;
}

export class ShowtimeSeatPriceResponseDto {
  @Expose()
  showtimeId: number;

  @Expose()
  @Type(() => SeatPriceItemDto)
  seatPrices: SeatPriceItemDto[];
}
