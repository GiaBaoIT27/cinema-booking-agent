import { IsIn, IsOptional } from 'class-validator';
import { AuditoriumStatus } from '../../../domain/enums/auditorium-status.enum.js';
import { AUDITORIUM_STATUS_FILTERS } from '../auditoriums/query-auditoriums.dto.js';
import type { AuditoriumStatusFilter } from '../auditoriums/query-auditoriums.dto.js';

export class QueryCineplexAuditoriumsDto {
  @IsOptional()
  @IsIn(AUDITORIUM_STATUS_FILTERS, {
    message: 'Trạng thái phòng phải là ACTIVE, MAINTENANCE, INACTIVE hoặc ALL',
  })
  status?: AuditoriumStatusFilter = AuditoriumStatus.ACTIVE;
}
