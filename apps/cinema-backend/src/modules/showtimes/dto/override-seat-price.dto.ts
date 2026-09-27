import { IsNumber, Min } from 'class-validator';

export class OverrideSeatPriceDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  finalPrice: number;
}
