import { IsArray, IsInt, ArrayMinSize, Min } from 'class-validator';

export class HoldSeatsDto {
  @IsInt()
  @Min(1)
  showtimeId: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  seatIds: number[];
}
