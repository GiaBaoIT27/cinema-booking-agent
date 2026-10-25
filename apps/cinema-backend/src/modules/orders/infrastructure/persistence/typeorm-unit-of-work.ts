import { Injectable } from '@nestjs/common';
import {
  DataSource,
  EntityManager,
  EntityTarget,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import type {
  IUnitOfWork,
  TransactionContext,
} from '../../domain/ports/transaction.port.js';

export class TypeOrmTransactionContext implements TransactionContext {
  readonly __brand = 'TransactionContext' as const;
  constructor(readonly manager: EntityManager) {}
}

/** Lấy EntityManager từ ngữ cảnh transaction (chỉ dùng trong infrastructure). */
export function managerOf(tx: TransactionContext): EntityManager {
  return (tx as TypeOrmTransactionContext).manager;
}

/** Có tx → repository gắn với transaction; không có → repository mặc định. */
export function repositoryOf<T extends ObjectLiteral>(
  entity: EntityTarget<T>,
  base: Repository<T>,
  tx?: TransactionContext,
): Repository<T> {
  return tx ? managerOf(tx).getRepository(entity) : base;
}

@Injectable()
export class TypeOrmUnitOfWork implements IUnitOfWork {
  constructor(private readonly dataSource: DataSource) {}

  run<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T> {
    return this.dataSource.transaction((manager) =>
      work(new TypeOrmTransactionContext(manager)),
    );
  }
}
