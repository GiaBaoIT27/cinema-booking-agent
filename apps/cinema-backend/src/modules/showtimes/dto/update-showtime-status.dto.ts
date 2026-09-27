import { IsEnum, IsNotEmpty } from 'class-validator';
import { ShowtimeStatus } from '../enums/showtime-status.enum.js';

export class UpdateShowtimeStatusDto {
  @IsNotEmpty({ message: 'Trạng thái suất chiếu không được để trống' })
  @IsEnum(ShowtimeStatus, {
    message:
      'Trạng thái suất chiếu không hợp lệ (SCHEDULED, OPEN, CLOSED, CANCELLED)',
  })
  status: ShowtimeStatus;
}
