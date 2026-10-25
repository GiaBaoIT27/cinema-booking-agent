import { IsOptional, Matches, IsNumberString } from 'class-validator';

/** Query của GET /api/v1/cineplexes/:id/showtimes (chuyển từ module cinemas). */
export class QueryCineplexShowtimesDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Ngày tìm kiếm phải theo đúng định dạng YYYY-MM-DD',
  })
  date?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'movieId phải là chuỗi số nguyên hợp lệ' })
  movieId?: string;
}
