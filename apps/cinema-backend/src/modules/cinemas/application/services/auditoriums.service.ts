import { Injectable, Inject, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Auditorium } from '../../domain/entities/auditorium.entity.js';
import { AuditoriumDeactivatedEvent } from '../../domain/events/auditorium-deactivated.event.js';
import { AuditoriumStatus } from '../../domain/enums/auditorium-status.enum.js';
import { UNIT_OF_WORK } from '../../domain/ports/transaction.port.js';
import type { IUnitOfWork } from '../../domain/ports/transaction.port.js';
import { AUDITORIUM_REPOSITORY } from '../../domain/repositories/auditorium.repository.interface.js';
import type {
  AuditoriumSearchCriteria,
  IAuditoriumRepository,
} from '../../domain/repositories/auditorium.repository.interface.js';
import { CINEPLEX_REPOSITORY } from '../../domain/repositories/cineplex.repository.interface.js';
import type { ICineplexRepository } from '../../domain/repositories/cineplex.repository.interface.js';
import { SEAT_REPOSITORY } from '../../domain/repositories/seat.repository.interface.js';
import type { ISeatRepository } from '../../domain/repositories/seat.repository.interface.js';
import {
  findLayoutCollision,
  totalCapacity,
  computeGridBounds,
  spanOf,
} from '../../domain/services/seat-layout.rules.js';

import { SEAT_TYPE_LOOKUP } from '../ports/seat-type-lookup.port.js';
import type { ISeatTypeLookup } from '../ports/seat-type-lookup.port.js';
import { AUDITORIUM_CACHE } from '../ports/auditorium-cache.port.js';
import type { IAuditoriumCache } from '../ports/auditorium-cache.port.js';

import { QueryAuditoriumsDto } from '../dto/auditoriums/query-auditoriums.dto.js';
import { CreateAuditoriumDto } from '../dto/auditoriums/create-auditorium.dto.js';
import { UpdateAuditoriumDto } from '../dto/auditoriums/update-auditorium.dto.js';
import { UpdateAuditoriumStatusDto } from '../dto/auditoriums/update-auditorium-status.dto.js';
import { CreateSeatLayoutDto } from '../dto/auditoriums/create-seat-layout.dto.js';
import {
  toAuditoriumListItem,
  toAuditoriumDetail,
  toAuditoriumResponse,
  toAuditoriumUpdateResponse,
  toAuditoriumStatusResponse,
} from '../mappers/auditorium.mapper.js';
import {
  toSeatLayoutResponse,
  toSeatLayoutConfiguredResponse,
} from '../mappers/seat.mapper.js';
import { toPagedResult } from '../mappers/paged-result.mapper.js';

import { BusinessException } from '#src/common/exceptions/business.exception.js';
import { ErrorCode } from '#src/common/constants/error-codes.enum.js';
import { EventNames } from '#src/common/constants/event-names.constant.js';

@Injectable()
export class AuditoriumsService {
  private readonly logger = new Logger(AuditoriumsService.name);

  constructor(
    @Inject(AUDITORIUM_REPOSITORY)
    private readonly auditoriumRepository: IAuditoriumRepository,
    @Inject(CINEPLEX_REPOSITORY)
    private readonly cineplexRepository: ICineplexRepository,
    @Inject(SEAT_REPOSITORY)
    private readonly seatRepository: ISeatRepository,
    @Inject(SEAT_TYPE_LOOKUP)
    private readonly seatTypeLookup: ISeatTypeLookup,
    @Inject(AUDITORIUM_CACHE)
    private readonly auditoriumCache: IAuditoriumCache,
    @Inject(UNIT_OF_WORK)
    private readonly unitOfWork: IUnitOfWork,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private notFound(id: string): BusinessException {
    return new BusinessException(
      ErrorCode.CINEMA_AUDITORIUM_NOT_FOUND,
      `Không tìm thấy phòng chiếu với ID = ${id}`,
    );
  }

  private duplicateCode(code: string): BusinessException {
    return new BusinessException(
      ErrorCode.CINEMA_DUPLICATE_AUDITORIUM_CODE,
      `Mã phòng chiếu '${code}' đã tồn tại trong cụm rạp này`,
    );
  }

  private async findEntityOrThrow(id: string): Promise<Auditorium> {
    const auditorium = await this.auditoriumRepository.findById(id);
    if (!auditorium) throw this.notFound(id);
    return auditorium;
  }

  // GET /api/v1/auditoriums
  async findAll(query: QueryAuditoriumsDto) {
    const criteria: AuditoriumSearchCriteria = {
      cineplexId: query.cineplexId,
      screenType: query.screenType,
      status: query.status === 'ALL' ? undefined : query.status,
      page: query.page,
      limit: query.limit,
    };

    return this.auditoriumCache.getPage(criteria, async () => {
      const { items, total } = await this.auditoriumRepository.search(criteria);
      return toPagedResult(
        items.map(toAuditoriumListItem),
        total,
        criteria.page,
        criteria.limit,
      );
    });
  }

  // GET /api/v1/auditoriums/:id
  async findOne(id: string) {
    return this.auditoriumCache.getDetail(id, async () => {
      const auditorium =
        await this.auditoriumRepository.findByIdWithCineplex(id);
      if (!auditorium) throw this.notFound(id);
      return toAuditoriumDetail(auditorium);
    });
  }

  // POST /api/v1/auditoriums
  async create(dto: CreateAuditoriumDto) {
    const cineplexId = String(dto.cineplexId);

    if (!(await this.cineplexRepository.existsById(cineplexId))) {
      throw new BusinessException(
        ErrorCode.CINEMA_CINEPLEX_NOT_FOUND,
        `Không tìm thấy cụm rạp với ID = ${dto.cineplexId}`,
      );
    }
    if (await this.auditoriumRepository.existsByCode(cineplexId, dto.code)) {
      throw this.duplicateCode(dto.code);
    }

    const instance = this.auditoriumRepository.create({
      cineplexId,
      code: dto.code,
      name: dto.name,
      screenType: dto.screenType,
      audioType: dto.audioType,
      totalSeats: dto.totalSeats,
      status: AuditoriumStatus.ACTIVE,
    });
    const saved = await this.auditoriumRepository.save(instance);

    await this.auditoriumCache.invalidateAuditoriums();
    return toAuditoriumResponse(saved);
  }

  // PUT /api/v1/auditoriums/:id
  async update(id: string, dto: UpdateAuditoriumDto) {
    const auditorium = await this.findEntityOrThrow(id);

    if (
      await this.auditoriumRepository.existsByCode(
        auditorium.cineplexId,
        dto.code,
        id,
      )
    ) {
      throw this.duplicateCode(dto.code);
    }

    auditorium.code = dto.code;
    auditorium.name = dto.name;
    auditorium.screenType = dto.screenType;
    auditorium.audioType = dto.audioType;
    auditorium.totalSeats = dto.totalSeats;

    const updated = await this.auditoriumRepository.save(auditorium);

    await this.auditoriumCache.invalidateAuditoriums();
    return toAuditoriumUpdateResponse(updated);
  }

  // PATCH /api/v1/auditoriums/:id/status
  async updateStatus(id: string, dto: UpdateAuditoriumStatusDto) {
    const { status, reason } = dto;

    const { saved, shouldCancelShowtimes } = await this.unitOfWork.run(
      async (tx) => {
        const auditorium = await this.auditoriumRepository.findByIdForUpdate(
          id,
          tx,
        );
        if (!auditorium) throw this.notFound(id);

        // Chuyển sang MAINTENANCE / INACTIVE: chỉ đánh dấu — SAU KHI commit
        // mới phát domain event để module showtimes tự hủy các suất tương lai
        // (việc hủy không còn nằm trong transaction của cinemas).
        const shouldCancelShowtimes =
          status === AuditoriumStatus.MAINTENANCE ||
          status === AuditoriumStatus.INACTIVE;

        auditorium.status = status;
        return {
          saved: await this.auditoriumRepository.save(auditorium, tx),
          shouldCancelShowtimes,
        };
      },
    );

    // SAU KHI commit: listener (module showtimes) hủy suất SCHEDULED/OPEN
    // của phòng + tự invalidate cache của nó, rồi phát SHOWTIME_CANCELLED.
    if (shouldCancelShowtimes) {
      this.logger.warn(
        `[Domain Event] Phát AUDITORIUM_DEACTIVATED cho phòng chiếu ID ${id} → ${status}`,
      );
      this.eventEmitter.emit(
        EventNames.AUDITORIUM_DEACTIVATED,
        new AuditoriumDeactivatedEvent(id, reason ?? null),
      );
    }

    await this.auditoriumCache.invalidateAuditoriums();

    return toAuditoriumStatusResponse(saved, reason);
  }

  // GET /api/v1/auditoriums/:id/seats
  async getSeatLayout(id: string) {
    return this.auditoriumCache.getSeatLayout(id, async () => {
      if (!(await this.auditoriumRepository.existsById(id))) {
        throw this.notFound(id);
      }

      const seats = await this.seatRepository.findByAuditoriumId(id);
      const seatTypeIds = [...new Set(seats.map((seat) => seat.seatTypeId))];
      const seatTypes = await this.seatTypeLookup.findByIds(seatTypeIds);

      return toSeatLayoutResponse(Number(id), seats, seatTypes);
    });
  }

  // POST /api/v1/auditoriums/:id/seats/batch
  async configureSeatLayout(id: string, dto: CreateSeatLayoutDto) {
    const auditorium = await this.findEntityOrThrow(id);

    // 1. Mọi seatTypeId trong payload phải tồn tại
    const seatTypeIds = [
      ...new Set(dto.items.map((item) => String(item.seatTypeId))),
    ];
    if (
      seatTypeIds.length > 0 &&
      !(await this.seatTypeLookup.existsAll(seatTypeIds))
    ) {
      throw new BusinessException(
        ErrorCode.SEAT_TYPE_NOT_FOUND,
        'Một hoặc nhiều loại ghế (seatTypeId) gửi lên không tồn tại trong hệ thống',
      );
    }

    // 2. Không trùng mã ghế / chồng lấp ô lưới ngay trong payload
    const collision = findLayoutCollision(dto.items);
    if (collision) {
      throw new BusinessException(
        ErrorCode.CINEMA_DUPLICATE_GRID_COORDINATES_IN_PAYLOAD,
        collision.kind === 'DUPLICATE_SEAT_NUMBER'
          ? `Mã ghế '${collision.seatNumber}' bị trùng lặp trong request payload`
          : `Tọa độ (X: ${collision.coordX}, Y: ${collision.coordY}) bị trùng/chồng lấp trong ma trận gửi lên`,
      );
    }

    // 3. Sức chứa quy đổi (tổng gridSpan) không vượt quá total_seats của phòng
    const requestedCapacity = totalCapacity(dto.items);
    if (requestedCapacity > auditorium.totalSeats) {
      throw new BusinessException(
        ErrorCode.CINEMA_EXCEEDS_MAX_AUDITORIUM_CAPACITY,
        `Tổng số ghế quy đổi (${requestedCapacity}) vượt quá sức chứa thiết kế của phòng chiếu (${auditorium.totalSeats})`,
      );
    }

    // 4. Ghi DB trong một transaction
    await this.unitOfWork.run(async (tx) => {
      if (dto.clearExisting) {
        await this.seatRepository.deleteByAuditoriumId(id, tx);
      }
      await this.seatRepository.insertMany(
        dto.items.map((item) => ({
          auditoriumId: id,
          seatTypeId: String(item.seatTypeId),
          rowLabel: item.rowLabel,
          columnNumber: item.columnNumber,
          seatNumber: item.seatNumber,
          coordX: item.coordX,
          coordY: item.coordY,
          gridSpan: spanOf(item),
          status: item.status,
        })),
        tx,
      );
    });

    await this.auditoriumCache.invalidateSeatLayout(id);

    return toSeatLayoutConfiguredResponse(
      Number(id),
      dto.items.length,
      computeGridBounds(dto.items),
    );
  }
}
