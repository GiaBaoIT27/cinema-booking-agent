import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AuditoriumStatus } from '#modules/cinemas/enums/auditorium-status.enum.js';

export class UpdateAuditoriumStatusDto {
  @IsNotEmpty({ message: 'status không được để trống' })
  @IsEnum(AuditoriumStatus, {
    message:
      'status phải thuộc một trong các giá trị: ACTIVE, MAINTENANCE, INACTIVE',
  })
  status: AuditoriumStatus;

  @IsOptional()
  @IsString({ message: 'reason phải là dạng chuỗi' })
  @MaxLength(255, { message: 'reason không được vượt quá 255 ký tự' })
  reason?: string;
}
