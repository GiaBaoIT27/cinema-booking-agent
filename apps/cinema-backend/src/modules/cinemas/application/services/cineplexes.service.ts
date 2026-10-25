import { Injectable, Inject, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Cineplex } from '../../domain/entities/cineplex.entity.js';
import { CineplexDeactivatedEvent } from '../../domain/events/cineplex-deactivated.event.js';
import { CineplexStatus } from '../../domain/enums/cineplex-status.enum.js';
import { AuditoriumStatus } from '../../domain/enums/auditorium-status.enum.js';
import { UNIT_OF_WORK } from '../../domain/ports/transaction.port.js';
import type { IUnitOfWork } from '../../domain/ports/transaction.port.js';
import { CINEPLEX_REPOSITORY } from '../../domain/repositories/cineplex.repository.interface.js';
import type {
  CineplexSearchCriteria,
  ICineplexRepository,
} from '../../domain/repositories/cineplex.repository.interface.js';
import { AUDITORIUM_REPOSITORY } from '../../domain/repositories/auditorium.repository.interface.js';
import type { IAuditoriumRepository } from '../../domain/repositories/auditorium.repository.interface.js';

import { LOCATION_LOOKUP } from '../ports/location-lookup.port.js';
import type { ILocationLookup } from '../ports/location-lookup.port.js';
import { FNB_CATALOG_GATEWAY } from '../ports/fnb-lookup.port.js';
import type { IFnbCatalogGateway } from '../ports/fnb-lookup.port.js';
import { CINEPLEX_CACHE } from '../ports/cineplex-cache.port.js';
import type { ICineplexCache } from '../ports/cineplex-cache.port.js';
import { AUDITORIUM_CACHE } from '../ports/auditorium-cache.port.js';
import type { IAuditoriumCache } from '../ports/auditorium-cache.port.js';

import { QueryCineplexesDto } from '../dto/cineplexes/query-cineplexes.dto.js';
import { CreateCineplexDto } from '../dto/cineplexes/create-cineplex.dto.js';
import { UpdateCineplexDto } from '../dto/cineplexes/update-cineplex.dto.js';
import { UpdateCineplexStatusDto } from '../dto/cineplexes/update-cineplex-status.dto.js';
import { QueryCineplexAuditoriumsDto } from '../dto/cineplexes/query-cineplex-auditoriums.dto.js';
import { QueryCineplexFnbItemsDto } from '../dto/cineplexes/query-cineplex-fnb-items.dto.js';
import {
  toCineplexListItem,
  toCineplexDetail,
  toCineplexResponse,
  toCineplexStatusResponse,
  toFnbItemResponse,
} from '../mappers/cineplex.mapper.js';
import { toAuditoriumResponse } from '../mappers/auditorium.mapper.js';
import { toPagedResult } from '../mappers/paged-result.mapper.js';

import { BusinessException } from '#src/common/exceptions/business.exception.js';
import { ErrorCode } from '#src/common/constants/error-codes.enum.js';
import { EventNames } from '#src/common/constants/event-names.constant.js';

@Injectable()
export class CineplexesService {
  private readonly logger = new Logger(CineplexesService.name);

  constructor(
    @Inject(CINEPLEX_REPOSITORY)
    private readonly cineplexRepository: ICineplexRepository,
    @Inject(AUDITORIUM_REPOSITORY)
    private readonly auditoriumRepository: IAuditoriumRepository,
    @Inject(LOCATION_LOOKUP)
    private readonly locationLookup: ILocationLookup,
    @Inject(FNB_CATALOG_GATEWAY)
    private readonly fnbCatalogGateway: IFnbCatalogGateway,
    @Inject(CINEPLEX_CACHE)
    private readonly cineplexCache: ICineplexCache,
    @Inject(AUDITORIUM_CACHE)
    private readonly auditoriumCache: IAuditoriumCache,
    @Inject(UNIT_OF_WORK)
    private readonly unitOfWork: IUnitOfWork,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private notFound(id: string): BusinessException {
    return new BusinessException(
      ErrorCode.CINEMA_CINEPLEX_NOT_FOUND,
      `Cụm rạp với ID ${id} không tồn tại trên hệ thống`,
    );
  }

  private async findEntityOrThrow(id: string): Promise<Cineplex> {
    const cineplex = await this.cineplexRepository.findById(id);
    if (!cineplex) throw this.notFound(id);
    return cineplex;
  }

  private async assertLocationValid(
    provinceId: number,
    wardId: number,
  ): Promise<void> {
    const valid = await this.locationLookup.isWardInProvince(
      String(provinceId),
      String(wardId),
    );
    if (!valid) {
      throw new BusinessException(
        ErrorCode.PROVINCE_OR_WARD_NOT_FOUND,
        'Tỉnh/Thành phố hoặc Xã/Phường không tồn tại hoặc không hợp lệ',
      );
    }
  }

  // GET /api/v1/cineplexes
  async findAll(query: QueryCineplexesDto) {
    const { latitude, longitude } = query;

    // Tọa độ GPS phải đi theo cặp
    if ((latitude == null) !== (longitude == null)) {
      throw new BusinessException(
        ErrorCode.MISSING_COORDINATE_PAIR,
        'Tọa độ latitude và longitude phải được truyền đồng thời',
      );
    }

    const criteria: CineplexSearchCriteria = {
      provinceId: query.provinceId,
      wardId: query.wardId,
      status: query.status === 'ALL' ? undefined : query.status,
      keyword: query.search,
      geo:
        latitude != null && longitude != null
          ? { latitude, longitude, radiusKm: query.radiusKm }
          : undefined,
      page: query.page,
      limit: query.limit,
    };

    return this.cineplexCache.getPage(criteria, async () => {
      const { items, total } = await this.cineplexRepository.search(criteria);
      return toPagedResult(
        items.map(toCineplexListItem),
        total,
        criteria.page,
        criteria.limit,
      );
    });
  }

  // GET /api/v1/cineplexes/:id
  async findOne(id: string) {
    const detail = await this.cineplexCache.getDetail(id, async () => {
      const cineplex = await this.cineplexRepository.findById(id);
      if (!cineplex) return null;

      const [province, ward] = await Promise.all([
        this.locationLookup.findProvince(cineplex.provinceId),
        this.locationLookup.findWard(cineplex.wardId),
      ]);
      return toCineplexDetail(cineplex, province, ward);
    });

    if (!detail) throw this.notFound(id);
    return detail;
  }

  // POST /api/v1/cineplexes
  async create(dto: CreateCineplexDto) {
    if (await this.cineplexRepository.existsByCode(dto.code)) {
      throw new BusinessException(
        ErrorCode.CINEMA_CINEPLEX_CODE_ALREADY_EXISTS,
        `Mã cụm rạp '${dto.code}' đã tồn tại trên hệ thống`,
      );
    }
    await this.assertLocationValid(dto.provinceId, dto.wardId);

    const instance = this.cineplexRepository.create({
      code: dto.code,
      name: dto.name,
      provinceId: String(dto.provinceId),
      wardId: String(dto.wardId),
      address: dto.address,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      phoneNumber: dto.phoneNumber ?? null,
      status: CineplexStatus.ACTIVE,
    });
    const saved = await this.cineplexRepository.save(instance);

    await this.cineplexCache.invalidateAll();
    return toCineplexResponse(saved);
  }

  // PUT /api/v1/cineplexes/:id
  async update(id: string, dto: UpdateCineplexDto) {
    const cineplex = await this.findEntityOrThrow(id);

    if (
      dto.code !== cineplex.code &&
      (await this.cineplexRepository.existsByCode(dto.code, id))
    ) {
      throw new BusinessException(
        ErrorCode.CINEMA_CINEPLEX_CODE_ALREADY_EXISTS,
        `Mã cụm rạp '${dto.code}' đã được sử dụng bởi cụm rạp khác`,
      );
    }
    await this.assertLocationValid(dto.provinceId, dto.wardId);

    cineplex.code = dto.code;
    cineplex.name = dto.name;
    cineplex.provinceId = String(dto.provinceId);
    cineplex.wardId = String(dto.wardId);
    cineplex.address = dto.address;
    cineplex.latitude = dto.latitude ?? null;
    cineplex.longitude = dto.longitude ?? null;
    cineplex.phoneNumber = dto.phoneNumber ?? null;

    const updated = await this.cineplexRepository.save(cineplex);

    // Tên/mã cụm rạp xuất hiện trong danh sách & chi tiết phòng chiếu => xóa cả cache phòng chiếu
    await Promise.all([
      this.cineplexCache.invalidateAll(),
      this.auditoriumCache.invalidateAuditoriums(),
    ]);
    return toCineplexResponse(updated);
  }

  // PATCH /api/v1/cineplexes/:id/status
  async updateStatus(id: string, dto: UpdateCineplexStatusDto) {
    const { status, reason } = dto;

    const { saved, deactivatedAuditoriumIds } = await this.unitOfWork.run(
      async (tx) => {
        const cineplex = await this.cineplexRepository.findById(id, tx);
        if (!cineplex) throw this.notFound(id);

        // ACTIVE -> CLOSED/MAINTENANCE: gom danh sách phòng chiếu của cụm —
        // SAU KHI commit sẽ phát domain event để module showtimes tự hủy
        // các suất OPEN chưa chiếu (việc hủy không còn nằm trong tx này).
        let deactivatedAuditoriumIds: string[] = [];
        if (
          (status === CineplexStatus.CLOSED ||
            status === CineplexStatus.MAINTENANCE) &&
          cineplex.status === CineplexStatus.ACTIVE
        ) {
          const auditoriums = await this.auditoriumRepository.findByCineplexId(
            id,
          );
          deactivatedAuditoriumIds = auditoriums.map((a) => String(a.id));
        }

        cineplex.status = status;
        return {
          saved: await this.cineplexRepository.save(cineplex, tx),
          deactivatedAuditoriumIds,
        };
      },
    );

    // SAU KHI commit: listener (module showtimes) hủy suất + tự invalidate
    // cache của nó, rồi phát SHOWTIME_CANCELLED cho payments/notifications.
    if (deactivatedAuditoriumIds.length > 0) {
      this.logger.warn(
        `[Domain Event] Phát CINEPLEX_DEACTIVATED cho cụm rạp ID ${id} (${deactivatedAuditoriumIds.length} phòng)`,
      );
      this.eventEmitter.emit(
        EventNames.CINEPLEX_DEACTIVATED,
        new CineplexDeactivatedEvent(
          id,
          deactivatedAuditoriumIds,
          reason ?? null,
        ),
      );
    }

    await this.cineplexCache.invalidateAll();

    return toCineplexStatusResponse(saved, reason);
  }

  // GET /api/v1/cineplexes/:id/auditoriums
  async findAuditoriums(
    cineplexId: string,
    query: QueryCineplexAuditoriumsDto,
  ) {
    const statusFilter = query.status ?? AuditoriumStatus.ACTIVE;

    return this.cineplexCache.getAuditoriums(
      cineplexId,
      statusFilter,
      async () => {
        if (!(await this.cineplexRepository.existsById(cineplexId))) {
          throw this.notFound(cineplexId);
        }

        const auditoriums = await this.auditoriumRepository.findByCineplexId(
          cineplexId,
          statusFilter === 'ALL' ? undefined : statusFilter,
        );
        return auditoriums.map(toAuditoriumResponse);
      },
    );
  }

  // GET /api/v1/cineplexes/:id/fnb-items
  async findFnbItems(cineplexId: string, query: QueryCineplexFnbItemsDto) {
    const { category } = query;

    return this.cineplexCache.getFnbItems(cineplexId, category, async () => {
      const cineplex = await this.findEntityOrThrow(cineplexId);

      // Cụm rạp đã đóng cửa => không bán F&B
      if (cineplex.status === CineplexStatus.CLOSED) return [];

      const items = await this.fnbCatalogGateway.findActiveItems(category);
      return items.map(toFnbItemResponse);
    });
  }
}
