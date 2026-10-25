/**
 * Ngữ cảnh transaction "mờ" (opaque): domain/application chỉ biết có một transaction,
 * không biết nó là EntityManager của TypeORM hay thứ gì khác.
 */
export interface TransactionContext {
  readonly __brand: 'TransactionContext';
}

export interface IUnitOfWork {
  /** Chạy `work` trong một transaction; ném lỗi => rollback, trả về => commit. */
  run<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T>;
}

export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');
