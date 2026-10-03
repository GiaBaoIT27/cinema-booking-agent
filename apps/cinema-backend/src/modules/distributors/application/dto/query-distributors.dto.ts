import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { DistributorStatus } from '../../domain/enums/distributor-status.enum.js';

export class GetDistributorsQueryDto {
  @IsOptional()
  @IsEnum(DistributorStatus, {
    message: 'status phải là ACTIVE hoặc SUSPENDED',
  })
  status?: DistributorStatus;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  name?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  taxCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'page phải lớn hơn hoặc bằng 1' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'limit phải lớn hơn hoặc bằng 1' })
  @Max(100, { message: 'limit tối đa là 100' })
  limit: number = 20;
}
