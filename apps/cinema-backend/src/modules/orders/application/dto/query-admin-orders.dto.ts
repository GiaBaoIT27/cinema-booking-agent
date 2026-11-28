import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { OrderStatus } from '../../domain/enums/order-status.enum.js';

export class QueryAdminOrdersDto {
  @IsOptional()
  @IsEnum(OrderStatus, {
    message: 'Trạng thái đơn không hợp lệ (PENDING, PAID, EXPIRED, CANCELLED, REFUNDED)',
  })
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  @Length(1, 100, { message: 'Từ khóa từ 1 đến 100 ký tự' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  keyword?: string;

  @IsOptional()
  @Matches(/^\d+$/, { message: 'cineplexId phải là số' })
  cineplexId?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date phải đúng định dạng YYYY-MM-DD' })
  date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100, { message: 'limit tối đa là 100' })
  limit: number = 20;
}
