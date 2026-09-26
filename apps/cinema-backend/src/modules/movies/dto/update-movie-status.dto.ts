import { IsEnum, IsNotEmpty } from 'class-validator';
import { MovieStatus } from '../enums/movie-status.enum.js';

export class UpdateMovieStatusDto {
  @IsNotEmpty({ message: 'Trạng thái phim không được để trống' })
  @IsEnum(MovieStatus, {
    message: 'Trạng thái phim không hợp lệ (UPCOMING, SHOWING, ENDED)',
  })
  status: MovieStatus;
}
