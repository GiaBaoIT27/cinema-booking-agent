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
  entities: [join(__dirname, '../**/*.entity.{ts,js}')],
  migrations: [join(__dirname, '../database/migrations/*.{ts,js}')],
});

