export interface SeatRef {
  id: string;
  auditoriumId: string;
  seatTypeId: string;
  rowLabel: string;
  seatNumber: string;
  /** Trạng thái ghế vật lý do module cinemas công bố (ACTIVE, MAINTENANCE, DISABLED). */
  status: string;
}

/** Tra cứu ghế vật lý – dữ liệu thuộc module `cinemas`. */
export interface ISeatCatalog {
  findByIds(seatIds: string[]): Promise<SeatRef[]>;
}

export const SEAT_CATALOG = Symbol('SEAT_CATALOG');
