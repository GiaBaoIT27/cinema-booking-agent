import { IsArray, ArrayMinSize, IsInt } from 'class-validator';

export class UpdateMovieGenresDto {
  @IsArray({ message: 'genreIds phải là một mảng' })
  @ArrayMinSize(1, {
    message: 'Danh sách thể loại thay thế phải có ít nhất 1 item',
  })
  @IsInt({ each: true, message: 'Mỗi genreId phải là số nguyên' })
  genreIds: number[];
}
