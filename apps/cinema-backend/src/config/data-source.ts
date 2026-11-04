/**
 * DataSource cho TypeORM CLI (migration:generate / run / revert).
 *
 * Luôn dùng bản BUILD (dist/config/data-source.js): code dùng alias "#src/*" trỏ vào dist/
 * qua "imports" của package.json, nên chạy từ dist giống hệt production.
 * Các script npm đã tự `npm run build` trước khi gọi CLI.
 */
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5433', 10),
  username: process.env.DB_USERNAME ?? 'cinema_admin',
  password: process.env.DB_PASSWORD ?? 'cinema_password',
  database: process.env.DB_NAME ?? 'cinema_db',
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
  // *.entities.* : module fnb đặt tên file entity theo dạng số nhiều
  entities: [join(__dirname, '../**/*.{entity,entities}.{ts,js}')],
  // Chỉ .js: trong dist có cả file .d.ts khớp đuôi .ts
  migrations: [join(__dirname, '../database/migrations/*.js')],
  migrationsTableName: 'typeorm_migrations',
});
