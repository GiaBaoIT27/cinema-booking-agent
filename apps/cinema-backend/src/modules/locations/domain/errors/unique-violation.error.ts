/**
 * Lỗi domain: vi phạm ràng buộc UNIQUE khi ghi dữ liệu.
 * Infrastructure dịch lỗi của DB sang lỗi này để application không phải biết
 * gì về TypeORM / mã lỗi Postgres.
 */
export class UniqueViolationError extends Error {
  constructor(public readonly columns: string[]) {
    super(`Unique constraint violated on: ${columns.join(', ')}`);
    this.name = 'UniqueViolationError';
  }

  involves(column: string): boolean {
    return this.columns.includes(column);
  }
}
