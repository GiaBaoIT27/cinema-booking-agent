import { SeatType } from '../../domain/entities/seat-type.entity.js';
import { SeatTypeResponseDto } from '../dto/seat-type-response.dto.js';

export function toSeatTypeResponse(seatType: SeatType): SeatTypeResponseDto {
  return {
    id: seatType.id,
    code: seatType.code,
    name: seatType.name,
    priceMultiplier: seatType.priceMultiplier,
    surchargeAmount: seatType.surchargeAmount,
    colorCode: seatType.colorCode,
    seatCount: seatType.seatCount,
    description: seatType.description,
    displayOrder: seatType.displayOrder,
    createdAt: seatType.createdAt,
    updatedAt: seatType.updatedAt,
  };
}
