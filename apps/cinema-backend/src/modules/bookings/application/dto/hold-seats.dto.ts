import { IsArray, IsInt, ArrayMaxSize, ArrayMinSize, Min } from 'class-validator';
import { MAX_SEATS_PER_USER_PER_SHOWTIME } from '../../domain/rules/booking-rules.js';

export class HoldSeatsDto {
  @IsInt()
  @Min(1)
  showtimeId: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_SEATS_PER_USER_PER_SHOWTIME, {
    message: `Mỗi lần chỉ được giữ tối đa ${MAX_SEATS_PER_USER_PER_SHOWTIME} ghế`,
  })
  @IsInt({ each: true })
  seatIds: number[];
}
