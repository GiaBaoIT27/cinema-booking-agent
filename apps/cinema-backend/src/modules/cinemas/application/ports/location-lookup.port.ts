export interface LocationRef {
  id: number | string;
  code: string;
  name: string;
}

/** Tra cứu địa giới hành chính – dữ liệu thuộc module `locations`. */
export interface ILocationLookup {
  /** Tỉnh tồn tại VÀ xã/phường tồn tại, thuộc đúng tỉnh đó. */
  isWardInProvince(provinceId: string, wardId: string): Promise<boolean>;

  findProvince(id: string): Promise<LocationRef | null>;

  findWard(id: string): Promise<LocationRef | null>;
}

export const LOCATION_LOOKUP = Symbol('LOCATION_LOOKUP');
