import { Type } from 'class-transformer';
import { IsArray, IsNumber, Min, ValidateNested, ArrayMinSize } from 'class-validator';

export class SeatPriceOverrideItemDto {
  @IsNumber()
  seatTypeId: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  finalPrice: number;
}

export class BatchOverrideSeatPricesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SeatPriceOverrideItemDto)
  items: SeatPriceOverrideItemDto[];
}
