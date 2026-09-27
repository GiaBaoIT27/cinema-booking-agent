import { IsEnum, IsOptional } from 'class-validator';

export enum AuditoriumStatusQuery {
  ACTIVE = 'ACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  INACTIVE = 'INACTIVE',
  ALL = 'ALL',
}

export class GetAuditoriumsQueryDto {
  @IsOptional()
  @IsEnum(AuditoriumStatusQuery, {
    message: 'Trạng thái phòng phải là ACTIVE, MAINTENANCE, INACTIVE hoặc ALL',
  })
  status?: AuditoriumStatusQuery = AuditoriumStatusQuery.ACTIVE;
}
