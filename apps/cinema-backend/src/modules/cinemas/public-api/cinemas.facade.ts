import { Injectable, Inject } from '@nestjs/common';

import { CineplexStatus } from '../domain/enums/cineplex-status.enum.js';
import { AuditoriumStatus } from '../domain/enums/auditorium-status.enum.js';
import { CINEPLEX_REPOSITORY } from '../domain/repositories/cineplex.repository.interface.js';
import type { ICineplexRepository } from '../domain/repositories/cineplex.repository.interface.js';
import { AUDITORIUM_REPOSITORY } from '../domain/repositories/auditorium.repository.interface.js';
import type { IAuditoriumRepository } from '../domain/repositories/auditorium.repository.interface.js';
import { SEAT_REPOSITORY } from '../domain/repositories/seat.repository.interface.js';
import type { ISeatRepository } from '../domain/repositories/seat.repository.interface.js';
import {
  toSeatSummary,
  toAuditoriumSummary,
  toCineplexSummary,
} from './summary.mapper.js';
import type { SeatSummaryDto } from './dto/seat-summary.dto.js';
import type { AuditoriumSummaryDto } from './dto/auditorium-summary.dto.js';
import type { CineplexSummaryDto } from './dto/cineplex-summary.dto.js';

/**
 * Cổng giao tiếp DUY NHẤT của module với bên ngoài.
 * Chỉ trả về các *SummaryDto – tuyệt đối không để lộ entity.
 */
@Injectable()
export class CinemasFacade {
  constructor(
    @Inject(CINEPLEX_REPOSITORY)
    private readonly cineplexRepository: ICineplexRepository,
    @Inject(AUDITORIUM_REPOSITORY)
    private readonly auditoriumRepository: IAuditoriumRepository,
    @Inject(SEAT_REPOSITORY)
    private readonly seatRepository: ISeatRepository,
  ) {}

  async getSeatsByIds(seatIds: string[]): Promise<SeatSummaryDto[]> {
    const seats = await this.seatRepository.findByIds(seatIds);
    return seats.map(toSeatSummary);
  }

  async getSeatsByAuditorium(
    auditoriumId: string | number,
  ): Promise<SeatSummaryDto[]> {
    const seats = await this.seatRepository.findByAuditoriumId(
      String(auditoriumId),
    );
    return seats.map(toSeatSummary);
  }

  async getAuditoriumInfo(
    auditoriumId: string | number,
  ): Promise<AuditoriumSummaryDto | null> {
    const auditorium = await this.auditoriumRepository.findById(
      String(auditoriumId),
    );
    return auditorium ? toAuditoriumSummary(auditorium) : null;
  }

  /** Cụm rạp có tồn tại hay không (tên cũ "assert" nhưng trả về boolean – giữ nguyên contract). */
  assertCineplexExists(cineplexId: string | number): Promise<boolean> {
    return this.cineplexRepository.existsById(String(cineplexId));
  }

  async isCineplexActive(cineplexId: string | number): Promise<boolean> {
    const cineplex = await this.cineplexRepository.findById(String(cineplexId));
    return cineplex?.status === CineplexStatus.ACTIVE;
  }

  async getCineplexById(
    cineplexId: string | number,
  ): Promise<CineplexSummaryDto | null> {
    const cineplex = await this.cineplexRepository.findById(String(cineplexId));
    return cineplex ? toCineplexSummary(cineplex) : null;
  }

  async getActiveAuditoriumsByCineplex(
    cineplexId: string | number,
  ): Promise<AuditoriumSummaryDto[]> {
    const auditoriums = await this.auditoriumRepository.findByCineplexId(
      String(cineplexId),
      AuditoriumStatus.ACTIVE,
    );
    return auditoriums.map(toAuditoriumSummary);
  }

  assertAuditoriumExists(auditoriumId: string | number): Promise<boolean> {
    return this.auditoriumRepository.existsById(String(auditoriumId));
  }
}
