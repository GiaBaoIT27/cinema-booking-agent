export type GenreUniqueField = 'code' | 'name';

/**
 * Lỗi domain: vi phạm ràng buộc unique khi ghi thể loại (race condition giữa bước
 * kiểm tra trùng và bước INSERT/UPDATE). Infrastructure ném ra; application chuyển thành lỗi HTTP.
 */
export class GenreUniqueViolationError extends Error {
  constructor(readonly field: GenreUniqueField) {
    super(`Genre unique constraint violated on '${field}'`);
    this.name = 'GenreUniqueViolationError';
  }
}
