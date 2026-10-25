export interface FnbItemRef {
  id: string;
  name: string;
  basePrice: number;
  isActive: boolean;
}

/** Danh mục đồ ăn/uống – dữ liệu thuộc module `fnb`. */
export interface IFnbCatalog {
  findByIds(ids: string[]): Promise<FnbItemRef[]>;
}

export const FNB_CATALOG = Symbol('FNB_CATALOG');
