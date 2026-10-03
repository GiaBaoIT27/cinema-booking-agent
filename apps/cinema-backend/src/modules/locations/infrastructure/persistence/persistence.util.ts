import { QueryFailedError } from 'typeorm';
import { UniqueViolationError } from '../../domain/errors/unique-violation.error.js';

const PG_UNIQUE_VIOLATION = '23505';

/** Escape ký tự đặc biệt của LIKE/ILIKE rồi bọc %...% */
export function toContainsPattern(keyword: string): string {
  return `%${keyword.trim().replace(/[%_\\]/g, '\\$&')}%`;
}

/**
 * Dịch lỗi UNIQUE của Postgres thành UniqueViolationError (domain).
 * Các lỗi khác được trả nguyên vẹn để caller `throw`.
 */
export function translatePersistenceError(error: unknown): unknown {
  if (error instanceof QueryFailedError) {
    const driver = error as unknown as { code?: string; detail?: string };
    if (driver.code === PG_UNIQUE_VIOLATION) {
      // detail dạng: Key (code)=(79) already exists.
      const columns = (driver.detail?.match(/Key \((.+?)\)=/)?.[1] ?? '')
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      return new UniqueViolationError(columns);
    }
  }
  return error;
}
