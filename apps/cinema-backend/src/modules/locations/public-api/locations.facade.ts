import { Injectable } from '@nestjs/common';
import { ProvincesService } from '../application/services/provinces.service.js';
import { WardsService } from '../application/services/wards.service.js';
import {
  ProvinceSummaryDto,
  WardSummaryDto,
  LocationSummaryDto,
} from './location-summary.dto.js';

/**
 * Cổng giao tiếp DUY NHẤT của module với bên ngoài.
 * Chỉ trả về các *SummaryDto – tuyệt đối không để lộ entity.
 */
@Injectable()
export class LocationsFacade {
  constructor(
    private readonly provincesService: ProvincesService,
    private readonly wardsService: WardsService,
  ) {}

  /**
   * Kiểm tra tính hợp lệ của cặp Tỉnh/Thành và Phường/Xã (khóa ngoại logic giữa các module):
   * Tỉnh tồn tại VÀ Phường/Xã tồn tại trực thuộc đúng Tỉnh đó.
   */
  async validateProvinceAndWard(
    provinceId: number | string,
    wardId: number | string,
  ): Promise<boolean> {
    const [province, ward] = await Promise.all([
      this.getProvinceById(provinceId),
      this.getWardById(wardId),
    ]);

    if (!province || !ward) return false;

    return ward.provinceId === Number(provinceId);
  }

  async isProvinceValid(provinceId: number | string): Promise<boolean> {
    return !!(await this.getProvinceById(provinceId));
  }

  /** Kiểm tra Phường/Xã tồn tại (tùy chọn: phải thuộc provinceId) */
  async isWardValid(
    wardId: number | string,
    provinceId?: number | string,
  ): Promise<boolean> {
    const ward = await this.getWardById(wardId);
    if (!ward) return false;

    if (provinceId !== undefined && provinceId !== null) {
      return ward.provinceId === Number(provinceId);
    }
    return true;
  }

  getProvinceById(id: number | string): Promise<ProvinceSummaryDto | null> {
    return this.provincesService.findSummaryById(String(id));
  }

  getWardById(id: number | string): Promise<WardSummaryDto | null> {
    return this.wardsService.findSummaryById(String(id));
  }

  /** Thông tin vị trí tổng hợp (Tỉnh + Phường/Xã) phục vụ hiển thị Cineplex/Address */
  async getLocationSummary(
    provinceId: number | string,
    wardId?: number | string,
  ): Promise<LocationSummaryDto | null> {
    const province = await this.getProvinceById(provinceId);
    if (!province) return null;

    let ward: WardSummaryDto | null = null;
    if (wardId !== undefined && wardId !== null) {
      ward = await this.getWardById(wardId);
    }

    return { province, ward };
  }

  /** Tất cả Tỉnh/Thành phố (phục vụ bộ lọc) */
  getAllProvinces(): Promise<ProvinceSummaryDto[]> {
    return this.provincesService.findAllSummaries();
  }
}
