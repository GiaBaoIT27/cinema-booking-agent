import { SeatType } from '../entities/seat-type.entity.js';

export interface ISeatTypeRepository {
  findAll(): Promise<SeatType[]>;

  findById(id: string): Promise<SeatType | null>;

  findByIds(ids: string[]): Promise<SeatType[]>;

  existsById(id: string): Promise<boolean>;

  /** Đếm số id thực sự tồn tại trong danh sách truyền vào */
  countByIds(ids: string[]): Promise<number>;

  /** Kiểm tra trùng mã loại ghế, có thể loại trừ chính bản ghi đang cập nhật */
  existsByCode(code: string, excludeId?: string): Promise<boolean>;

  create(data: Partial<SeatType>): SeatType;

  save(seatType: SeatType): Promise<SeatType>;

  deleteById(id: string): Promise<void>;
}

export const SEAT_TYPE_REPOSITORY = Symbol('SEAT_TYPE_REPOSITORY');
