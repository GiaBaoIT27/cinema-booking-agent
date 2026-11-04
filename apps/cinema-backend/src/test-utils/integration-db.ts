/// <reference types="vite/client" />
/**
 * Hạ tầng integration test trên Postgres THẬT (chỉ dùng trong *.int-spec.ts, chạy bằng vitest).
 * DB riêng TEST_DB_NAME (mặc định `cinema_test`) được tạo nếu chưa có; schema dựng lại bằng
 * synchronize + dropSchema mỗi lần; khóa ngoại tắt trong phiên (session_replication_role=replica)
 * để không phải seed phim/rạp/phòng chiếu.
 */
import { DataSource } from 'typeorm';

const DB = {
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5433', 10),
  username: process.env.DB_USERNAME ?? 'cinema_admin',
  password: process.env.DB_PASSWORD ?? 'cinema_password',
  database: process.env.TEST_DB_NAME ?? 'cinema_test',
};

/** Nạp toàn bộ entity (quan hệ khai báo bằng chuỗi cần đủ metadata). */
function loadEntities(): Function[] {
  const modules = import.meta.glob<Record<string, unknown>>(
    ['../**/*.entity.ts', '../**/*.entities.ts'],
    { eager: true },
  );
  return Object.values(modules)
    .flatMap((mod) => Object.values(mod))
    .filter((value): value is Function => typeof value === 'function');
}

async function ensureTestDatabase(): Promise<void> {
  const admin = new DataSource({ type: 'postgres', ...DB, database: 'postgres' });
  await admin.initialize();
  try {
    const exists: unknown[] = await admin.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [DB.database],
    );
    if (exists.length === 0) await admin.query(`CREATE DATABASE "${DB.database}"`);
  } finally {
    await admin.destroy();
  }
}

export async function createIntegrationDataSource(): Promise<DataSource> {
  await ensureTestDatabase();
  const ds = new DataSource({
    type: 'postgres',
    ...DB,
    entities: loadEntities(),
    synchronize: true,
    dropSchema: true,
    extra: { max: 30, options: '-c session_replication_role=replica' },
  });
  await ds.initialize();
  return ds;
}
