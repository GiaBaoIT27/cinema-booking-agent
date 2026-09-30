import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { TicketStatus } from '../enums/ticket-status.enum.js';

export class GetTicketsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'orderId phải là số nguyên' })
  @Min(1, { message: 'orderId phải lớn hơn hoặc bằng 1' })
  orderId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'showtimeId phải là số nguyên' })
  @Min(1, { message: 'showtimeId phải lớn hơn hoặc bằng 1' })
  showtimeId?: number;

  @IsOptional()
  @IsEnum(TicketStatus, {
    message: 'Trạng thái vé không hợp lệ (VALID, CHECKED_IN, CANCELLED)',
  })
  status?: TicketStatus;

  @IsOptional()
  @IsString({ message: 'ticketCode phải là chuỗi ký tự' })
  @Length(1, 100, { message: 'ticketCode phải có độ dài từ 1 đến 100 ký tự' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  ticketCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page phải là số nguyên' })
  @Min(1, { message: 'Trang phải lớn hơn hoặc bằng 1' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1, { message: 'limit phải lớn hơn hoặc bằng 1' })
  @Max(100, { message: 'Kích thước trang tối đa là 100' })
  limit: number = 20;
}
