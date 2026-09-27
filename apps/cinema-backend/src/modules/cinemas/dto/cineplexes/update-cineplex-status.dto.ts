import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CineplexStatus } from '#modules/cinemas/enums/cineplex-status.enum.js';

export class UpdateCineplexStatusDto {
  @IsNotEmpty({ message: 'Trạng thái không được để trống' })
  @IsEnum(CineplexStatus, {
    message:
      'Trạng thái phải thuộc một trong các giá trị: ACTIVE, MAINTENANCE, CLOSED',
  })
  status: CineplexStatus;

  @IsOptional()
  @IsString({ message: 'Lý do phải là chuỗi' })
  @MaxLength(255, { message: 'Lý do không được vượt quá 255 ký tự' })
  reason?: string;
}
