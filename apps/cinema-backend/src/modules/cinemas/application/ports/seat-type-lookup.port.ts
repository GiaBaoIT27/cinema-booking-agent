export interface SeatTypeRef {
  id: number | string;
  code: string;
  name: string;
  colorCode: string;
}

/** Tra cứu loại ghế – dữ liệu thuộc module `seat-types`. */
export interface ISeatTypeLookup {
  exists(id: string): Promise<boolean>;

  /** Tất cả id (đã loại trùng) đều tồn tại. */
  existsAll(ids: string[]): Promise<boolean>;

  findByIds(ids: string[]): Promise<SeatTypeRef[]>;
}

export const SEAT_TYPE_LOOKUP = Symbol('SEAT_TYPE_LOOKUP');
