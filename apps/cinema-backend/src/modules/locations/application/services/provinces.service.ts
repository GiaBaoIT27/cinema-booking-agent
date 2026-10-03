import { Injectable, Inject } from '@nestjs/common';
import { PROVINCE_REPOSITORY } from '../../domain/repositories/province.repository.interface.js';
import type {
  IProvinceRepository,
  ProvinceSearchOptions,
} from '../../domain/repositories/province.repository.interface.js';
import { WARD_REPOSITORY } from '../../domain/repositories/ward.repository.interface.js';
import type { IWardRepository } from '../../domain/repositories/ward.repository.interface.js';
import { ProvinceType } from '../../domain/enums/province-type.enum.js';
import { UniqueViolationError } from '../../domain/errors/unique-violation.error.js';

import { LOCATION_CACHE } from '../ports/location-cache.port.js';
import type { ILocationCache } from '../ports/location-cache.port.js';

import { CreateProvinceDto } from '../dto/create-province.dto.js';
import { QueryProvincesDto } from '../dto/query-province.dto.js';
import { QueryProvinceWardsDto } from '../dto/query-province-wards.dto.js';
import {
  ProvinceResponseDto,
  PagedResultDto,
  ProvinceWardsPageDto,
} from '../dto/location-response.dto.js';
import {
  toProvinceResponse,
  toProvinceSummary,
  toWardResponse,
  toPagedResult,
} from '../mappers/location.mapper.js';

import { BusinessException } from '#src/common/exceptions/business.exception.js';
import { ErrorCode } from '#src/common/constants/error-codes.enum.js';

@Injectable()
export class ProvincesService {
  constructor(
    @Inject(PROVINCE_REPOSITORY)
    private readonly provinceRepository: IProvinceRepository,
    @Inject(WARD_REPOSITORY)
    private readonly wardRepository: IWardRepository,
    @Inject(LOCATION_CACHE)
    private readonly locationCache: ILocationCache,
  ) {}

  private duplicateCode(code: string): BusinessException {
    return new BusinessException(
      ErrorCode.PROVINCE_CODE_ALREADY_EXISTS,
      `Mã Tỉnh/Thành phố '${code}' đã tồn tại trên hệ thống`,
    );
  }

  private duplicateName(name: string): BusinessException {
    return new BusinessException(
      ErrorCode.PROVINCE_NAME_ALREADY_EXISTS,
      `Tên Tỉnh/Thành phố '${name}' đã tồn tại trên hệ thống`,
    );
  }

  // GET /api/v1/provinces
  async findAll(
    query: QueryProvincesDto,
  ): Promise<PagedResultDto<ProvinceResponseDto>> {
    const options: ProvinceSearchOptions = {
      type: query.type,
      keyword: query.keyword,
      page: query.page,
      limit: query.limit,
    };

    return this.locationCache.getProvincePage(options, async () => {
      const { items, total } = await this.provinceRepository.findPage(options);
      return toPagedResult(
        items.map(toProvinceResponse),
        total,
        options.page,
        options.limit,
      );
    });
  }

  // POST /api/v1/provinces
  async create(dto: CreateProvinceDto): Promise<ProvinceResponseDto> {
    const { code, name, type } = dto;

    if (await this.provinceRepository.existsByCode(code)) {
      throw this.duplicateCode(code);
    }
    if (await this.provinceRepository.existsByName(name)) {
      throw this.duplicateName(name);
    }

    try {
      const instance = this.provinceRepository.create({
        code,
        name,
        type: type ?? ProvinceType.PROVINCE,
      });
      const saved = await this.provinceRepository.save(instance);

      await this.locationCache.invalidateAll();
      return toProvinceResponse(saved);
    } catch (error) {
      // Race condition: hai request cùng lọt qua bước kiểm tra trùng ở trên
      if (error instanceof UniqueViolationError) {
        if (error.involves('code')) throw this.duplicateCode(code);
        if (error.involves('name')) throw this.duplicateName(name);
      }
      throw error;
    }
  }

  // GET /api/v1/provinces/{province_id}/wards
  async getProvinceWards(
    provinceId: string,
    query: QueryProvinceWardsDto,
  ): Promise<ProvinceWardsPageDto> {
    const province = await this.provinceRepository.findById(provinceId);
    if (!province) {
      throw new BusinessException(
        ErrorCode.PROVINCE_NOT_FOUND,
        `Không tìm thấy Tỉnh/Thành phố với ID ${provinceId}`,
      );
    }

    const { items, total } = await this.wardRepository.findPageByProvince(
      provinceId,
      {
        type: query.type,
        keyword: query.keyword,
        page: query.page,
        limit: query.limit,
      },
    );

    return {
      ...toPagedResult(
        items.map(toWardResponse),
        total,
        query.page,
        query.limit,
      ),
      meta: {
        provinceInfo: {
          id: Number(province.id),
          code: province.code,
          name: province.name,
        },
      },
    };
  }

  // ---- Dùng cho LocationsFacade ----

  async findSummaryById(id: string): Promise<ProvinceResponseDto | null> {
    return this.locationCache.getProvinceSummary(id, async () => {
      const province = await this.provinceRepository.findById(id);
      return province ? toProvinceSummary(province) : null;
    });
  }

  async findAllSummaries(): Promise<ProvinceResponseDto[]> {
    return this.locationCache.getAllProvinceSummaries(async () => {
      const provinces = await this.provinceRepository.findAllOrderedByCode();
      return provinces.map(toProvinceSummary);
    });
  }
}
