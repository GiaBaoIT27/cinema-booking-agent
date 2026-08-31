import { IsEnum, IsNotEmpty } from 'class-validator';
import { DistributorStatus } from '../enums/distributor-status.enum.js';

export class UpdateDistributorStatusDto {
  @IsEnum(DistributorStatus)
  @IsNotEmpty()
  status: DistributorStatus;
}
