import {
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class CreateGenreDto {
  @IsNotEmpty({ message: 'Mã thể loại phim không được để trống' })
  @IsString({ message: 'Mã thể loại phim phải là chuỗi' })
  @Length(2, 50, {
    message: 'Mã thể loại phim phải có độ dài từ 2 đến 50 ký tự',
  })
  @Matches(/^[A-Z0-9_]+$/, {
    message:
      'Mã thể loại phim phải ở định dạng Upper-SNAKE_CASE (VD: ANIMATION, SCI_FI)',
  })
  code: string;

  @IsNotEmpty({ message: 'Tên thể loại phim không được để trống' })
  @IsString({ message: 'Tên thể loại phim phải là chuỗi' })
  @Length(2, 100, {
    message: 'Tên thể loại phim phải có độ dài từ 2 đến 100 ký tự',
  })
  name: string;

  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi' })
  @MaxLength(255, { message: 'Mô tả tối đa 255 ký tự' })
  description?: string;
}
