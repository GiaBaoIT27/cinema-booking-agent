import { FnbCategory } from '../domain/enums/fnb-category.enum.js';
import { FnbItemType } from '../domain/enums/fnb-item-type.enum.js';

export class FnbItemSummaryDto {
  id: string;
  sku: string;
  name: string;
  type: FnbItemType;
  category: FnbCategory;
  unit: string;
  basePrice: number;
  imageUrl: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
