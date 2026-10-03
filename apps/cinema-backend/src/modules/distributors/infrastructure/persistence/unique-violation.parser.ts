import {
  DistributorUniqueViolationError,
  type DistributorUniqueField,
} from '../../domain/errors/distributor-unique-violation.error.js';

const COLUMN_TO_FIELD: Record<string, DistributorUniqueField> = {
  name: 'name',
  tax_code: 'taxCode',
};

/**
 * Phân tích lỗi Postgres 23505 (unique_violation) thành lỗi domain.
 * Đọc đúng tên cột trong `Key (<cột>)=(...)` thay vì `detail.includes('name')`
 * (cách cũ nhận nhầm khi giá trị trùng tình cờ chứa chữ "name").
 *
 * Trả về null nếu không phải lỗi unique của name/tax_code → caller ném lại lỗi gốc.
 */
export function toUniqueViolation(
  error: unknown,
): DistributorUniqueViolationError | null {
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

  return field ? new DistributorUniqueViolationError(field) : null;
}
