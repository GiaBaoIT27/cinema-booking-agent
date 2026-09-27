import {
  IsNotEmpty,
  IsInt,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsOptional,
  IsString,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderChannel } from '../enums/order-channel.enum.js';
import { FnbOrderItemDto } from './fnb-order-item.dto.js';

export class CreateOrderDto {
  @IsNotEmpty({ message: 'showtimeId không được để trống' })
  @IsInt({ message: 'showtimeId phải là số nguyên' })
  showtimeId: number;

  @IsNotEmpty({ message: 'seatIds không được để trống' })
  @IsArray({ message: 'seatIds phải là một mảng' })
  @ArrayMinSize(1, { message: 'Cần chọn ít nhất 1 ghế' })
  @ArrayMaxSize(8, { message: 'Tối đa chỉ được chọn 8 ghế trong một đơn hàng' })
  @IsInt({ each: true, message: 'Mỗi seatId phải là số nguyên' })
  seatIds: number[];

  @IsOptional()
  @IsArray({ message: 'fnbItems phải là một mảng' })
  @ValidateNested({ each: true })
  @Type(() => FnbOrderItemDto)
  fnbItems?: FnbOrderItemDto[];

  @IsOptional()
  @IsString({ message: 'voucherCode phải là chuỗi ký tự' })
  voucherCode?: string;

  @IsNotEmpty({ message: 'channel không được để trống' })
  @IsEnum(OrderChannel, {
    message: 'channel không hợp lệ (ONLINE_APP, ONLINE_WEB, POS_COUNTER)',
  })
  channel: OrderChannel;
}
