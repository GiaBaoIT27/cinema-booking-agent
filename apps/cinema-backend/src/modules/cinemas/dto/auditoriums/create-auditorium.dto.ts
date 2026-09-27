import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';
import { ScreenType } from '#modules/cinemas/enums/screen-type.enum.js';
import { AudioType } from '#modules/cinemas/enums/audio-type.enum.js';

export class CreateAuditoriumDto {
  @IsNotEmpty({ message: 'cineplexId không được để trống' })
  @IsInt({ message: 'cineplexId phải là số nguyên' }) // Đổi từ String sang Int để khớp với Spec (cineplexId: 10)
  cineplexId: number;

  @IsNotEmpty({ message: 'code không được để trống' })
  @IsString({ message: 'code phải là dạng chuỗi' })
  @Length(2, 50, { message: 'code phải có độ dài từ 2 đến 50 ký tự' })
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'code chỉ chấp nhận chữ cái in hoa, số, dấu - và _',
  })
  code: string;

  @IsNotEmpty({ message: 'name không được để trống' })
  @IsString({ message: 'name phải là dạng chuỗi' })
  @Length(2, 100, { message: 'name phải có độ dài từ 2 đến 100 ký tự' })
  name: string;

  @IsNotEmpty({ message: 'screenType không được để trống' })
  @IsEnum(ScreenType, {
    message: 'screenType phải là STANDARD, IMAX, 4DX hoặc GOLD_CLASS',
  })
  screenType: ScreenType;

  @IsNotEmpty({ message: 'audioType không được để trống' })
  @IsEnum(AudioType, {
    message: 'audioType phải là DOLBY_ATMOS, 7.1_SURROUND hoặc 5.1_SURROUND',
  })
  audioType: AudioType;

  @IsNotEmpty({ message: 'totalSeats không được để trống' })
  @IsInt({ message: 'totalSeats phải là số nguyên' })
  @Min(1, { message: 'totalSeats phải lớn hơn 0' })
  totalSeats: number;
}
