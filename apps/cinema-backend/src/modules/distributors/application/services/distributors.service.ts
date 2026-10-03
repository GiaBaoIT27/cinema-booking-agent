import { Inject, Injectable, Logger } from '@nestjs/common';
import { DISTRIBUTOR_REPOSITORY } from '../../domain/repositories/distributor.repository.interface.js';
import type { IDistributorRepository } from '../../domain/repositories/distributor.repository.interface.js';
import { MOVIE_CATALOG_GATEWAY } from '../../domain/ports/movie-catalog.gateway.port.js';
import type { IMovieCatalogGateway } from '../../domain/ports/movie-catalog.gateway.port.js';
import { SETTLEMENT_LOOKUP } from '../../domain/ports/settlement-lookup.port.js';
import type { ISettlementLookup } from '../../domain/ports/settlement-lookup.port.js';
import { DistributorStatus } from '../../domain/enums/distributor-status.enum.js';
import { DistributorUniqueViolationError } from '../../domain/errors/distributor-unique-violation.error.js';
import { Distributor } from '../../domain/entities/distributor.entity.js';

import { GetDistributorsQueryDto } from '../dto/query-distributors.dto.js';
import { CreateDistributorDto } from '../dto/create-distributor.dto.js';
import { UpdateDistributorDto } from '../dto/update-distributor.dto.js';
import { UpdateDistributorStatusDto } from '../dto/update-distributor-status.dto.js';

import { BusinessException } from '#src/common/exceptions/business.exception.js';
import { ErrorCode } from '#src/common/constants/error-codes.enum.js';

import {
  formatSettlementPeriod,
  toDistributorCreateResponse,
  toDistributorDetail,
  toDistributorListItem,
  toDistributorStatusResponse,
  toDistributorUpdateResponse,
} from '../mappers/distributor.mapper.js';

@Injectable()
export class DistributorsService {
  private readonly logger = new Logger(DistributorsService.name);

  constructor(
    @Inject(DISTRIBUTOR_REPOSITORY)
    private readonly distributorRepository: IDistributorRepository,
    @Inject(MOVIE_CATALOG_GATEWAY)
    private readonly movieCatalog: IMovieCatalogGateway,
    @Inject(SETTLEMENT_LOOKUP)
    private readonly settlementLookup: ISettlementLookup,
  ) {}

  // GET api/v1/distributors
  async findAll(query: GetDistributorsQueryDto) {
    const { items, total } = await this.distributorRepository.search(query);

    return {
      data: items.map(toDistributorListItem),
      pagination: {
        page: query.page,
        limit: query.limit,
        totalItems: total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  }

  // POST api/v1/distributors
  async create(dto: CreateDistributorDto) {
    await this.assertUnique(dto.name, dto.taxCode);

    const distributor = this.distributorRepository.create({
      name: dto.name,
      taxCode: dto.taxCode,
      address: dto.address,
      contactPerson: dto.contactPerson,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      bankAccountNumber: dto.bankAccountNumber ?? null,
      bankName: dto.bankName ?? null,
      status: DistributorStatus.ACTIVE,
    });

    const saved = await this.saveOrThrowConflict(distributor, dto);
    return toDistributorCreateResponse(saved);
  }

  // GET api/v1/distributors/:id
  async findOne(id: number) {
    const distributorId = String(id);

    const distributor =
      await this.distributorRepository.findById(distributorId);
    if (!distributor)
      throw new BusinessException(
        ErrorCode.DISTRIBUTOR_NOT_FOUND,
        `Nhà phát hành với ID ${id} không tồn tại trên hệ thống`,
      );

    const [totalDistributedMovies, lastSettlement] = await Promise.all([
      this.movieCatalog.countByDistributor(distributorId),
      this.settlementLookup.findLastCompletedPeriod(distributorId),
    ]);

    return toDistributorDetail(
      distributor,
      totalDistributedMovies,
      formatSettlementPeriod(lastSettlement),
    );
  }

  // PUT api/v1/distributors/:id
  async update(id: number, dto: UpdateDistributorDto) {
    const distributorId = String(id);

    const distributor =
      await this.distributorRepository.findById(distributorId);
    if (!distributor)
      throw new BusinessException(
        ErrorCode.DISTRIBUTOR_NOT_FOUND,
        `Nhà phát hành với ID ${id} không tồn tại trên hệ thống`,
      );

    await this.assertUnique(dto.name, dto.taxCode, distributorId);

    distributor.name = dto.name;
    distributor.taxCode = dto.taxCode;
    distributor.address = dto.address;
    distributor.contactPerson = dto.contactPerson;
    distributor.contactEmail = dto.contactEmail;
    distributor.contactPhone = dto.contactPhone;
    distributor.bankAccountNumber = dto.bankAccountNumber ?? null;
    distributor.bankName = dto.bankName ?? null;

    const saved = await this.saveOrThrowConflict(distributor, dto);
    return toDistributorUpdateResponse(saved);
  }

  // PATCH api/v1/distributors/:id/status
  async updateStatus(id: number, dto: UpdateDistributorStatusDto) {
    const distributorId = String(id);

    const distributor =
      await this.distributorRepository.findById(distributorId);
    if (!distributor)
      throw new BusinessException(
        ErrorCode.DISTRIBUTOR_NOT_FOUND,
        `Nhà phát hành với ID ${id} không tồn tại trên hệ thống`,
      );

    const updated = await this.distributorRepository.updateStatus(
      distributorId,
      dto.status,
    );

    // Audit log: module movies/showtimes chặn tạo mới qua DistributorsFacade.isActive()
    if (dto.status === DistributorStatus.SUSPENDED) {
      this.logger.warn(
        `[AUDIT] Nhà phát hành '${distributor.name}' (ID: ${id}) đã bị SUSPENDED. Tác vụ tạo phim mới và tạo suất chiếu mới thuộc NPH này sẽ bị chặn.`,
      );
    }

    return toDistributorStatusResponse(updated);
  }

  /** Kiểm tra trùng tên rồi mã số thuế (giữ thứ tự báo lỗi như API cũ). */
  private async assertUnique(
    name: string,
    taxCode: string,
    excludeId?: string,
  ): Promise<void> {
    if (await this.distributorRepository.existsName(name, excludeId)) {
      throw new BusinessException(
        ErrorCode.DISTRIBUTOR_NAME_ALREADY_EXISTS,
        `Tên nhà phát hành '${name}' đã tồn tại trên hệ thống`,
      );
    }
    if (await this.distributorRepository.existsTaxCode(taxCode, excludeId)) {
      throw new BusinessException(
        ErrorCode.DISTRIBUTOR_TAX_CODE_ALREADY_EXISTS,
        `Mã số thuế '${taxCode}' đã tồn tại trên hệ thống`,
      );
    }
  }

  /** Lưới an toàn cho race condition: hai request cùng qua bước kiểm tra trùng. */
  private async saveOrThrowConflict(
    distributor: Distributor,
    input: { name: string; taxCode: string },
  ): Promise<Distributor> {
    try {
      return await this.distributorRepository.save(distributor);
    } catch (error) {
      if (error instanceof DistributorUniqueViolationError) {
        throw error.field === 'name'
          ? new BusinessException(
              ErrorCode.DISTRIBUTOR_NAME_ALREADY_EXISTS,
              `Tên nhà phát hành '${input.name}' đã tồn tại trên hệ thống`,
            )
          : new BusinessException(
              ErrorCode.DISTRIBUTOR_TAX_CODE_ALREADY_EXISTS,
              `Mã số thuế '${input.taxCode}' đã tồn tại trên hệ thống`,
            );
      }
      throw error;
    }
  }
}
