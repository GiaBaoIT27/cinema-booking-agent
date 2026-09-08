import { IsEnum, IsNotEmpty } from 'class-validator';
import { DistributorStatus } from '../enums/distributor-status.enum.js';

export class UpdateDistributorStatusDto {
  @IsNotEmpty({ message: 'Trạng thái status không được để trống' })
  @IsEnum(DistributorStatus, {
    message: 'Trạng thái status phải là ACTIVE hoặc SUSPENDED',
  })
  status: DistributorStatus;
}
