export interface SettlementPeriod {
  startDate: Date | string;
  endDate: Date | string;
}

/** Cổng đọc dữ liệu đối soát tài chính (module `financial-settlements`). */
export interface ISettlementLookup {
  /** Kỳ đối soát COMPLETED gần nhất (theo end_date) của nhà phát hành, null nếu chưa có. */
  findLastCompletedPeriod(
    distributorId: string,
  ): Promise<SettlementPeriod | null>;
}

export const SETTLEMENT_LOOKUP = Symbol('SETTLEMENT_LOOKUP');
