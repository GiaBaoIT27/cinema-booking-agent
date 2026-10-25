import { PriceRule } from '../entities/price-rules.entity.js';
import { DayType } from '../enums/day-type.enum.js';
import { ProjectionType } from '../enums/projection-type.enum.js';

export interface PriceRuleListFilter {
  cineplexId?: number;
  projectionType?: ProjectionType;
  dayType?: DayType;
  page: number;
  limit: number;
}

export interface PaginatedPriceRules {
  data: PriceRule[];
  totalItems: number;
}

export interface PriceRuleOverlapQuery {
  projectionType: ProjectionType;
  dayType: DayType;
  startTime: string;
  endTime: string;
  cineplexId?: number | null;
  excludeId?: string;
}

export interface MatchingPriceRuleQuery {
  projectionType: ProjectionType;
  dayType: DayType;
  cineplexId?: string | null;
  showtimeClock: string;
}

export interface IPriceRuleRepository {
  findById(id: string): Promise<PriceRule | null>;

  findByIdWithCineplex(id: string): Promise<PriceRule | null>;

  findPaginated(filter: PriceRuleListFilter): Promise<PaginatedPriceRules>;

  findOverlapping(query: PriceRuleOverlapQuery): Promise<number>;

  findMatchingBasePrice(
    query: MatchingPriceRuleQuery,
  ): Promise<PriceRule | null>;

  create(data: Partial<PriceRule>): PriceRule;

  save(rule: Partial<PriceRule> | PriceRule): Promise<PriceRule>;

  delete(id: string): Promise<void>;
}

export const PRICE_RULE_REPOSITORY = Symbol('PRICE_RULE_REPOSITORY');
