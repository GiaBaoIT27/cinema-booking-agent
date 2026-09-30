import { Expose, Transform } from 'class-transformer';

export class PriceRuleListItemResponseDto {
  @Expose()
  @Transform(({ value }) => Number(value))
  id: number;

  @Expose()
  @Transform(({ value }) =>
    value !== null && value !== undefined ? Number(value) : null,
  )
  cineplexId: number | null;

  @Expose()
  // Sử dụng obj để truy cập vào object gốc trước khi map
  @Transform(({ obj }) => {
    return obj.cineplex ? obj.cineplex.name : 'Tất cả cụm rạp (Toàn hệ thống)';
  })
  cineplexName: string;

  @Expose()
  projectionType: string;

  @Expose()
  dayType: string;

  @Expose()
  startTime: string;

  @Expose()
  endTime: string;

  @Expose()
  @Transform(({ value }) => Number(value))
  basePrice: number;
}
