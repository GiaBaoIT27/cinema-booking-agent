import { IsOptional, IsInt, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class GetMovieShowtimesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'cineplexId phải là số nguyên' })
  cineplexId?: number;

  @IsOptional()
  @IsDateString({}, { message: 'Định dạng date không hợp lệ (YYYY-MM-DD)' })
  date?: string;
}
