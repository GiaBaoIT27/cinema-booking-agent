import {
  IsNotEmpty,
  IsInt,
  IsEnum,
  IsString,
  Length,
  IsDateString,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { ProjectionType } from '../enums/projection-type.enum.js';

export class CreateShowtimeDto {
  @IsNotEmpty({ message: 'auditoriumId không được để trống' })
  @IsInt({ message: 'auditoriumId phải là số nguyên' })
  auditoriumId: number;

  @IsNotEmpty({ message: 'movieId không được để trống' })
  @IsInt({ message: 'movieId phải là số nguyên' })
  movieId: number;

  @IsNotEmpty({ message: 'projectionType không được để trống' })
  @IsEnum(ProjectionType, {
    message: 'Loại chiếu không hợp lệ (2D, 3D, 4DX, IMAX)',
  })
  projectionType: ProjectionType;

  @IsNotEmpty({ message: 'audioLanguage không được để trống' })
  @IsString({ message: 'audioLanguage phải là chuỗi ký tự' })
  @Length(1, 50, { message: 'audioLanguage phải có độ dài từ 1 đến 50 ký tự' })
  audioLanguage: string;

  @IsOptional()
  @IsString({ message: 'subtitleLanguage phải là chuỗi ký tự' })
  @Length(1, 50, {
    message: 'subtitleLanguage phải có độ dài từ 1 đến 50 ký tự',
  })
  subtitleLanguage?: string;

  @IsNotEmpty({ message: 'startTime không được để trống' })
  @IsDateString(
    {},
    { message: 'startTime phải theo định dạng ISO 8601 UTC standard' },
  )
  startTime: string;

  @IsOptional()
  @IsInt({ message: 'cleaningMinutes phải là số nguyên' })
  @Min(0, { message: 'cleaningMinutes tối thiểu là 0 phút' })
  @Max(60, { message: 'cleaningMinutes tối đa là 60 phút' })
  cleaningMinutes?: number = 15;
}
