export interface FnbItemRow {
  id: number | string;
  sku: string;
  name: string;
  type: string;
  category: string;
  unit: string;
  basePrice: number | string;
  imageUrl: string | null;
  description: string | null;
  isActive: boolean;
}

/** Cổng sang module `fnb` (danh mục đồ ăn/uống). */
export interface IFnbCatalogGateway {
  /** Sản phẩm đang hoạt động, sắp theo category rồi tên. */
  findActiveItems(category?: string): Promise<FnbItemRow[]>;
}

export const FNB_CATALOG_GATEWAY = Symbol('FNB_CATALOG_GATEWAY');
