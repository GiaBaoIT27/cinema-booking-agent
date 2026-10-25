export type FnbCategory = "POPCORN" | "BEVERAGE" | "SNACK" | "COMBO";

export type FnbItemType = "SINGLE" | "COMBO";

/** Sản phẩm F&B đúng như backend trả về (GET /api/v1/fnb-items) */
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
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

/** Query params của GET /api/v1/fnb-items (khớp GetFnbItemsDto) */
export interface GetFnbItemsParams {
  category?: FnbCategory;
  type?: FnbItemType;
  isActive?: boolean;
  page?: number;
  /** Tối đa 100 */
  limit?: number;
}

/** Sản phẩm kèm số lượng khách đã chọn */
export interface FnbSelection {
  item: FnbItem;
  quantity: number;
}
