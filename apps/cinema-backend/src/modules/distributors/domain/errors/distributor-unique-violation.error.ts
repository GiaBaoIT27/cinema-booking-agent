export type DistributorUniqueField = 'name' | 'taxCode';

/**
 * Lỗi domain: vi phạm ràng buộc unique khi ghi nhà phát hành (race condition giữa
 * bước kiểm tra trùng và bước INSERT/UPDATE). Do infrastructure ném ra; tầng
 * application chuyển thành lỗi HTTP phù hợp.
 */
export class DistributorUniqueViolationError extends Error {
  constructor(readonly field: DistributorUniqueField) {
    super(`Distributor unique constraint violated on '${field}'`);
    this.name = 'DistributorUniqueViolationError';
  }
}
