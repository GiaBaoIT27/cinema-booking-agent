import {
  GenreUniqueViolationError,
  type GenreUniqueField,
} from '../../domain/errors/genre-unique-violation.error.js';

const COLUMN_TO_FIELD: Record<string, GenreUniqueField> = {
  code: 'code',
  name: 'name',
};

/**
 * Phân tích lỗi Postgres 23505 (unique_violation) thành lỗi domain, đọc đúng tên cột
 * trong `Key (<cột>)=(...)`. Trả về null nếu không phải lỗi unique của code/name.
 */
export function toUniqueViolation(
  error: unknown,
): GenreUniqueViolationError | null {
  const err = error as {
    code?: string;
    detail?: string;
    driverError?: { code?: string; detail?: string };
  } | null;

  const code = err?.driverError?.code ?? err?.code;
  if (code !== '23505') return null;

  const detail = err?.driverError?.detail ?? err?.detail ?? '';
  const column = /Key \(([^)]+)\)=/.exec(detail)?.[1];
  const field = column ? COLUMN_TO_FIELD[column] : undefined;

  return field ? new GenreUniqueViolationError(field) : null;
}
