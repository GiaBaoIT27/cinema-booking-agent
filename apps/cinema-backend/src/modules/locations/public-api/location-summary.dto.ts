export class ProvinceSummaryDto {
  id: number;
  code: string;
  name: string;
  type: string;
}

export class WardSummaryDto {
  id: number;
  provinceId: number;
  code: string;
  name: string;
  type: string;
}

export class LocationSummaryDto {
  province: ProvinceSummaryDto;
  ward?: WardSummaryDto | null;
}
