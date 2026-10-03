import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type {
  ISettlementLookup,
  SettlementPeriod,
} from '../../domain/ports/settlement-lookup.port.js';

/**
 * Adapter đọc dữ liệu đối soát tài chính.
 * TODO: thay bằng facade của module financial-settlements khi module đó có public-api.
 */
@Injectable()
export class SqlSettlementLookupAdapter implements ISettlementLookup {
  constructor(private readonly dataSource: DataSource) {}

  async findLastCompletedPeriod(
    distributorId: string,
  ): Promise<SettlementPeriod | null> {
    const row = await this.dataSource
      .createQueryBuilder()
      .select('s.start_date', 'startDate')
      .addSelect('s.end_date', 'endDate')
      .from('financial_settlements', 's')
      .where('s.distributor_id = :id', { id: distributorId })
      .andWhere("s.status = 'COMPLETED'")
      .orderBy('s.end_date', 'DESC')
      .getRawOne<{ startDate: Date | string; endDate: Date | string }>();

    return row?.startDate && row?.endDate
      ? { startDate: row.startDate, endDate: row.endDate }
      : null;
  }
}
