import type { DistributorStatus } from '../../domain/enums/distributor-status.enum.js';

/** Thông tin tóm tắt của nhà phát hành dành cho module khác (không lộ thông tin ngân hàng/liên hệ). */
export interface DistributorSummaryDto {
  id: number;
  name: string;
  taxCode: string;
  status: DistributorStatus;
}
