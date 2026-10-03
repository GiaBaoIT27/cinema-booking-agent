import { Injectable, Inject } from '@nestjs/common';

import { SEAT_TYPE_REPOSITORY } from '../../domain/repositories/seat-types.repository.interface.js';
import type { ISeatTypeRepository } from '../../domain/repositories/seat-types.repository.interface.js';
import { SeatType } from '../../domain/entities/seat-type.entity.js';

import { SEAT_TYPE_CACHE } from '../ports/seat-type-cache.port.js';
import type { ISeatTypeCache } from '../ports/seat-type-cache.port.js';
import { SEAT_TYPE_USAGE_CHECKER } from '../ports/seat-type-usage-checker.port.js';
import type { ISeatTypeUsageChecker } from '../ports/seat-type-usage-checker.port.js';

import { CreateSeatTypeDto } from '../dto/create-seat-type.dto.js';
import { UpdateSeatTypeDto } from '../dto/update-seat-type.dto.js';
import { SeatTypeResponseDto } from '../dto/seat-type-response.dto.js';
import { toSeatTypeResponse } from '../mappers/seat-type.mapper.js';

import { BusinessException } from '#src/common/exceptions/business.exception.js';
import { ErrorCode } from '#src/common/constants/error-codes.enum.js';

@Injectable()
export class SeatTypesService {
  constructor(
    @Inject(SEAT_TYPE_REPOSITORY)
    private readonly seatTypeRepository: ISeatTypeRepository,
    @Inject(SEAT_TYPE_CACHE)
    private readonly seatTypeCache: ISeatTypeCache,
    @Inject(SEAT_TYPE_USAGE_CHECKER)
    private readonly usageChecker: ISeatTypeUsageChecker,
  ) {}

  /** Đọc thẳng từ DB (không qua cache) – dùng cho luồng ghi để tránh sửa trên dữ liệu cũ */
  private async findEntityOrThrow(id: string): Promise<SeatType> {
    const seatType = await this.seatTypeRepository.findById(id);
    if (!seatType) {
      throw new BusinessException(
        ErrorCode.SEAT_TYPE_NOT_FOUND,
        `Loại ghế với ID ${id} không tồn tại trên hệ thống`,
      );
    }
    return seatType;
  }

  private async assertCodeAvailable(
    code: string,
    excludeId?: string,
  ): Promise<void> {
    if (await this.seatTypeRepository.existsByCode(code, excludeId)) {
      throw new BusinessException(
        ErrorCode.SEAT_TYPE_CODE_ALREADY_EXISTS,
        excludeId
          ? `Mã loại ghế '${code}' đã được sử dụng bởi loại ghế khác`
          : `Mã loại ghế '${code}' đã tồn tại trên hệ thống`,
      );
    }
  }

  // GET /api/v1/seat-types
  async findAll(): Promise<SeatTypeResponseDto[]> {
    const items = await this.seatTypeCache.getAll(() =>
      this.seatTypeRepository.findAll(),
    );
    return items.map(toSeatTypeResponse);
  }

  // Dùng cho facade: không tìm thấy thì trả về null thay vì ném lỗi
  async findByIdOrNull(id: string): Promise<SeatTypeResponseDto | null> {
    const seatType = await this.seatTypeCache.getById(id, () =>
      this.seatTypeRepository.findById(id),
    );
    return seatType ? toSeatTypeResponse(seatType) : null;
  }

  // GET /api/v1/seat-types/:id
  async findOne(id: string): Promise<SeatTypeResponseDto> {
    const seatType = await this.findByIdOrNull(id);
    if (!seatType) {
      throw new BusinessException(
        ErrorCode.SEAT_TYPE_NOT_FOUND,
        `Loại ghế với ID ${id} không tồn tại trên hệ thống`,
      );
    }
    return seatType;
  }

  // POST /api/v1/seat-types
  async create(dto: CreateSeatTypeDto): Promise<SeatTypeResponseDto> {
    await this.assertCodeAvailable(dto.code);

    const instance = this.seatTypeRepository.create(dto);
    const saved = await this.seatTypeRepository.save(instance);

    await this.seatTypeCache.invalidate();
    return toSeatTypeResponse(saved);
  }

  // PUT /api/v1/seat-types/:id
  async update(
    id: string,
    dto: UpdateSeatTypeDto,
  ): Promise<SeatTypeResponseDto> {
    const seatType = await this.findEntityOrThrow(id);
    await this.assertCodeAvailable(dto.code, id);

    seatType.code = dto.code;
    seatType.name = dto.name;
    seatType.priceMultiplier = dto.priceMultiplier;
    seatType.surchargeAmount = dto.surchargeAmount;
    seatType.colorCode = dto.colorCode;
    seatType.seatCount = dto.seatCount;
    seatType.displayOrder = dto.displayOrder;
    if (dto.description !== undefined) {
      seatType.description = dto.description;
    }

    const updated = await this.seatTypeRepository.save(seatType);

    await this.seatTypeCache.invalidate(id);
    return toSeatTypeResponse(updated);
  }

  // DELETE /api/v1/seat-types/:id
  async remove(id: string): Promise<{ deletedSeatTypeId: number }> {
    await this.findEntityOrThrow(id);

    if (await this.usageChecker.isInUse(id)) {
      throw new BusinessException(
        ErrorCode.SEAT_TYPE_HAS_ASSOCIATED_SEATS,
        'Không thể xóa loại ghế này vì đã liên kết với ghế vật lý trong phòng chiếu',
      );
    }

    await this.seatTypeRepository.deleteById(id);
    await this.seatTypeCache.invalidate(id);

    return { deletedSeatTypeId: Number(id) };
  }
}
