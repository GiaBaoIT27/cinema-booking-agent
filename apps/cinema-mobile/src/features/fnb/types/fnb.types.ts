/** Khớp fnb.type.ts của web. */
export type FnbCategory = "POPCORN" | "BEVERAGE" | "SNACK" | "COMBO";
export type FnbItemType = "SINGLE" | "COMBO";

/** GET /api/v1/fnb-items */
export interface FnbItem {
  /** bigint ở DB → backend trả về dạng chuỗi */
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
}

export interface GetFnbItemsParams {
  category?: FnbCategory;
  type?: FnbItemType;
  isActive?: boolean;
  page?: number;
  /** Tối đa 100 */
  limit?: number;
}

export interface FnbCategoryGroup {
  category: string;
  label: string;
  items: FnbItem[];
}
