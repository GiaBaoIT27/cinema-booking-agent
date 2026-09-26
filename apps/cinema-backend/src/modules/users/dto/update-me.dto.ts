import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateMeDto {
  @IsString({ message: 'Họ và tên phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Họ và tên không được để trống.' })
  @Length(2, 150, { message: 'Họ và tên phải từ 2 đến 150 ký tự.' })
  fullName: string; // ĐÃ SỬA: Bắt buộc (Không còn @IsOptional)

  @IsNotEmpty({ message: 'Số điện thoại không được để trống.' })
  @Matches(/^(0[3|5|7|8|9])+([0-9]{8})\b/, {
    message: 'Số điện thoại không đúng định dạng Việt Nam (ví dụ: 0912345678).',
  })
  phoneNumber: string;

  @IsNotEmpty({ message: 'Ngày sinh không được để trống.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Ngày sinh phải tuân theo định dạng YYYY-MM-DD.',
  })
  @Transform(({ value }) => {
    if (!value) return value;
    const inputDate = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(inputDate.getTime()) || inputDate >= today) {
      throw new Error('Ngày sinh bắt buộc phải nhỏ hơn ngày hiện tại.');
    }
    return value;
  })
  dateOfBirth: string;
}
