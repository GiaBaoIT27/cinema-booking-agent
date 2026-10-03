import { Injectable, Inject } from '@nestjs/common';

import { SEAT_TYPE_REPOSITORY } from '../domain/repositories/seat-types.repository.interface.js';
import type { ISeatTypeRepository } from '../domain/repositories/seat-types.repository.interface.js';
import { SeatTypesService } from '../application/services/seat-type.service.js';
import { toSeatTypeResponse } from '../application/mappers/seat-type.mapper.js';
import { SeatTypeSummaryDto } from './seat-type-summary.dto.js';

/**
 * Cổng giao tiếp DUY NHẤT của module với bên ngoài.
 * Chỉ trả về SeatTypeSummaryDto – tuyệt đối không để lộ entity.
 */
@Injectable()
export class SeatTypesFacade {
  constructor(
    @Inject(SEAT_TYPE_REPOSITORY)
    private readonly seatTypeRepository: ISeatTypeRepository,
    private readonly seatTypesService: SeatTypesService,
  ) {}

  findAll(): Promise<SeatTypeSummaryDto[]> {
    return this.seatTypesService.findAll();
  }

  findById(id: string | number): Promise<SeatTypeSummaryDto | null> {
    return this.seatTypesService.findByIdOrNull(String(id));
  }

  async findByIds(ids: string[]): Promise<SeatTypeSummaryDto[]> {
    const items = await this.seatTypeRepository.findByIds(ids);
    return items.map(toSeatTypeResponse);
  }

  exists(id: string | number): Promise<boolean> {
    return this.seatTypeRepository.existsById(String(id));
  }

  async existsMany(ids: string[]): Promise<boolean> {
    const uniqueIds = [...new Set(ids)];
    if (!uniqueIds.length) return true;
    const count = await this.seatTypeRepository.countByIds(uniqueIds);
    return count === uniqueIds.length;
  }
}
