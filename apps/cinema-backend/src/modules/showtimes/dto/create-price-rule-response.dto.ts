import { Expose, Transform } from 'class-transformer';

export class PriceRuleCreatedResponseDto {
  @Expose()
  @Transform(({ value }) => Number(value))
  id: number;

  @Expose()
  @Transform(({ value }) =>
    value !== null && value !== undefined ? Number(value) : null,
  )
  cineplexId: number | null;

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
