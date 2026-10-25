import { FnbItem } from '../../domain/entities/fnb-item.entities.js';
import type { FnbItemSummaryDto } from '../../public-api/fnb-summary.dto.js';

/** Map entity FnbItem → FnbItemSummaryDto (công khai ra ngoài module) */
export function toFnbItemSummary(item: FnbItem): FnbItemSummaryDto {
  return {
    id: item.id,
    sku: item.sku,
    name: item.name,
    type: item.type,
    category: item.category,
    unit: item.unit,
    basePrice: item.basePrice,
    imageUrl: item.imageUrl,
    description: item.description,
    isActive: item.isActive,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
