import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { SeatStatus } from '../../enums/seat-status.enum.js';
import { Type } from 'class-transformer';

export class CreateSeatLayoutItemDto {
  @IsNotEmpty({ message: 'seatTypeId không được để trống' })
  @IsInt({ message: 'seatTypeId phải là số nguyên' })
  seatTypeId: number;

  @IsNotEmpty({ message: 'rowLabel không được để trống' })
  @IsString({ message: 'rowLabel phải là dạng chuỗi' })
  @Length(1, 5, { message: 'rowLabel có độ dài từ 1 đến 5 ký tự' })
  rowLabel: string;

  @IsNotEmpty({ message: 'columnNumber không được để trống' })
  @IsInt({ message: 'columnNumber phải là số nguyên' })
  @Min(1, { message: 'columnNumber phải lớn hơn 0' })
  columnNumber: number;

  @IsNotEmpty({ message: 'seatNumber không được để trống' })
  @IsString({ message: 'seatNumber phải là dạng chuỗi' })
  seatNumber: string;

  @IsNotEmpty({ message: 'coordX không được để trống' })
  @IsInt({ message: 'coordX phải là số nguyên' })
  @Min(0, { message: 'coordX không được là số âm' })
  coordX: number;

  @IsNotEmpty({ message: 'coordY không được để trống' })
  @IsInt({ message: 'coordY phải là số nguyên' })
  @Min(0, { message: 'coordY không được là số âm' })
  coordY: number;

  @IsOptional()
  @IsInt({ message: 'gridSpan phải là số nguyên' })
  @Min(1, { message: 'gridSpan tối thiểu là 1' })
  gridSpan: number = 1;

  @IsOptional()
  @IsEnum(SeatStatus, {
    message:
      'status phải thuộc một trong các giá trị: ACTIVE, MAINTENANCE, DISABLED',
  })
  status: SeatStatus = SeatStatus.ACTIVE;
}

export class CreateSeatLayoutDto {
  @IsNotEmpty({ message: 'clearExisting không được để trống' })
  @IsBoolean({ message: 'clearExisting phải là kiểu boolean' })
  clearExisting: boolean;

  @IsNotEmpty({ message: 'Danh sách ghế không được để trống' })
  @IsArray({ message: 'items phải là một mảng danh sách ghế' })
  @ValidateNested({ each: true })
  @Type(() => CreateSeatLayoutItemDto)
  items: CreateSeatLayoutItemDto[];
}
