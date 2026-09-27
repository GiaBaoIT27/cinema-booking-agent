import { IsArray, IsInt, IsOptional, IsString, ArrayMinSize, Min, IsEnum } from 'class-validator';
import { OrderChannel } from '#modules/orders/enums/order-channel.enum.js';

export class ConfirmBookingDto {
  @IsInt()
  @Min(1)
  showtimeId: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  seatIds: number[];

  @IsEnum(OrderChannel)
  @IsOptional()
  channel?: OrderChannel;
}
