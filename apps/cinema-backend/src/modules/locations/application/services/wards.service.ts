import { Injectable, Inject } from '@nestjs/common';

import { WARD_REPOSITORY } from '../../domain/repositories/ward.repository.interface.js';
import type {
  IWardRepository,
  WardSearchOptions,
} from '../../domain/repositories/ward.repository.interface.js';
import { PROVINCE_REPOSITORY } from '../../domain/repositories/province.repository.interface.js';
import type { IProvinceRepository } from '../../domain/repositories/province.repository.interface.js';
import { UniqueViolationError } from '../../domain/errors/unique-violation.error.js';

import { LOCATION_CACHE } from '../ports/location-cache.port.js';
import type { ILocationCache } from '../ports/location-cache.port.js';

import { CreateWardDto } from '../dto/create-ward.dto.js';
import { QueryWardsDto } from '../dto/query-wards.dto.js';
import {
  WardResponseDto,
  PagedResultDto,
} from '../dto/location-response.dto.js';
import {
  toWardResponse,
  toWardSummary,
  toPagedResult,
} from '../mappers/location.mapper.js';

import { BusinessException } from '#src/common/exceptions/business.exception.js';
import { ErrorCode } from '#src/common/constants/error-codes.enum.js';

@Injectable()
export class WardsService {
  constructor(
    @Inject(WARD_REPOSITORY)
    private readonly wardRepository: IWardRepository,
    @Inject(PROVINCE_REPOSITORY)
    private readonly provinceRepository: IProvinceRepository,
    @Inject(LOCATION_CACHE)
    private readonly locationCache: ILocationCache,
  ) {}

  private duplicateCode(code: string): BusinessException {
    return new BusinessException(
      ErrorCode.WARD_CODE_ALREADY_EXISTS,
      `Mã Xã/Phường '${code}' đã tồn tại trên hệ thống`,
    );
  }

  // GET /api/v1/wards
  async findAll(
    query: QueryWardsDto,
  ): Promise<PagedResultDto<WardResponseDto>> {
    const options: WardSearchOptions = {
      provinceId: query.provinceId ? String(query.provinceId) : undefined,
      type: query.type,
      keyword: query.keyword,
      page: query.page,
      limit: query.limit,
    };

    return this.locationCache.getWardPage(options, async () => {
      const { items, total } = await this.wardRepository.findPage(options);
      return toPagedResult(
        items.map(toWardResponse),
        total,
        options.page,
        options.limit,
      );
    });
  }

  // POST /api/v1/wards
  async create(dto: CreateWardDto): Promise<WardResponseDto> {
    const { code, name, type } = dto;
    const provinceId = String(dto.provinceId);

    if (!(await this.provinceRepository.existsById(provinceId))) {
      throw new BusinessException(
        ErrorCode.PROVINCE_NOT_FOUND,
        `Không tìm thấy Tỉnh/Thành phố với ID ${provinceId}`,
      );
    }

    if (await this.wardRepository.existsByCode(code)) {
      throw this.duplicateCode(code);
    }

    try {
      const instance = this.wardRepository.create({
        provinceId,
        code,
        name,
        type,
      });
      const saved = await this.wardRepository.save(instance);

      await this.locationCache.invalidateAll();
      return toWardResponse(saved);
    } catch (error) {
      // Race condition: hai request cùng lọt qua bước kiểm tra trùng ở trên
      if (error instanceof UniqueViolationError) {
        throw this.duplicateCode(code);
      }
      throw error;
    }
  }

  // ---- Dùng cho LocationsFacade ----

  async findSummaryById(id: string): Promise<WardResponseDto | null> {
    return this.locationCache.getWardSummary(id, async () => {
      const ward = await this.wardRepository.findById(id);
      return ward ? toWardSummary(ward) : null;
    });
  }
}
