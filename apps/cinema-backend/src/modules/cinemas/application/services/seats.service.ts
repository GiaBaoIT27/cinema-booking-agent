import { Injectable, Inject } from '@nestjs/common';

import { Seat } from '../../domain/entities/seat.entity.js';
import { SEAT_REPOSITORY } from '../../domain/repositories/seat.repository.interface.js';
import type { ISeatRepository } from '../../domain/repositories/seat.repository.interface.js';

import { SEAT_TYPE_LOOKUP } from '../ports/seat-type-lookup.port.js';
import type { ISeatTypeLookup } from '../ports/seat-type-lookup.port.js';
import { AUDITORIUM_CACHE } from '../ports/auditorium-cache.port.js';
import type { IAuditoriumCache } from '../ports/auditorium-cache.port.js';

import { UpdateSeatDto } from '../dto/seats/update-seat.dto.js';
import { toSeatResponse } from '../mappers/seat.mapper.js';

import { BusinessException } from '#src/common/exceptions/business.exception.js';
import { ErrorCode } from '#src/common/constants/error-codes.enum.js';

@Injectable()
export class SeatsService {
  constructor(
    @Inject(SEAT_REPOSITORY)
    private readonly seatRepository: ISeatRepository,
    @Inject(SEAT_TYPE_LOOKUP)
    private readonly seatTypeLookup: ISeatTypeLookup,
    @Inject(AUDITORIUM_CACHE)
    private readonly auditoriumCache: IAuditoriumCache,
  ) {}

  private async findEntityOrThrow(id: string): Promise<Seat> {
    const seat = await this.seatRepository.findById(id);
    if (!seat) {
      throw new BusinessException(
        ErrorCode.CINEMA_SEAT_NOT_FOUND,
        `Không tìm thấy thông tin chi tiết vị trí ghế với ID = ${id}`,
      );
    }
    return seat;
  }

  // GET /api/v1/seats/:id
  async findOne(id: string) {
    return toSeatResponse(await this.findEntityOrThrow(id));
  }

  // PUT /api/v1/seats/:id
  async update(id: string, dto: UpdateSeatDto) {
    const seat = await this.findEntityOrThrow(id);
    const seatTypeId = String(dto.seatTypeId);

    const [seatTypeExists, duplicateNumber, duplicateCoords] =
      await Promise.all([
        this.seatTypeLookup.exists(seatTypeId),
        this.seatRepository.existsSeatNumber(
          seat.auditoriumId,
          dto.seatNumber,
          id,
        ),
        this.seatRepository.existsCoordinates(
          seat.auditoriumId,
          dto.coordX,
          dto.coordY,
          id,
        ),
      ]);

    if (!seatTypeExists) {
      throw new BusinessException(
        ErrorCode.SEAT_TYPE_NOT_FOUND,
        `Loại ghế (seatTypeId = ${dto.seatTypeId}) không tồn tại trên hệ thống`,
      );
    }
    if (duplicateNumber) {
      throw new BusinessException(
        ErrorCode.CINEMA_DUPLICATE_SEAT_NUMBER,
        `Mã ghế '${dto.seatNumber}' đã được sử dụng trong phòng chiếu này`,
      );
    }
    if (duplicateCoords) {
      throw new BusinessException(
        ErrorCode.CINEMA_DUPLICATE_GRID_COORDINATES,
        `Tọa độ Grid (X: ${dto.coordX}, Y: ${dto.coordY}) đã bị chiếm dụng bởi một ghế khác trong phòng này`,
      );
    }

    seat.seatTypeId = seatTypeId;
    seat.rowLabel = dto.rowLabel;
    seat.columnNumber = dto.columnNumber;
    seat.seatNumber = dto.seatNumber;
    seat.coordX = dto.coordX;
    seat.coordY = dto.coordY;
    seat.gridSpan = dto.gridSpan;

    const updated = await this.seatRepository.save(seat);

    // Sơ đồ ghế của phòng chiếu đang được cache => phải xóa
    await this.auditoriumCache.invalidateSeatLayout(seat.auditoriumId);
    return toSeatResponse(updated);
  }
}
