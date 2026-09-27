import { IsOptional, Matches, IsNumberString } from 'class-validator';

export class GetCineplexShowtimesQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Ngày tìm kiếm phải theo đúng định dạng YYYY-MM-DD',
  })
  date?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'movieId phải là chuỗi số nguyên hợp lệ' })
  movieId?: string;
}
