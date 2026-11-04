import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5433', 10),
  username: process.env.DB_USERNAME ?? 'cinema_admin',
  password: process.env.DB_PASSWORD ?? 'cinema_password',
  name: process.env.DB_NAME ?? 'cinema_db',
  synchronize: process.env.NODE_ENV !== 'production', // Chỉ bật ở môi trường Dev
  // Production: tự chạy migration còn thiếu lúc khởi động (tắt bằng DB_RUN_MIGRATIONS=false
  // nếu pipeline deploy chạy `npm run migration:run` riêng trước khi bật app).
  runMigrations:
    (process.env.DB_RUN_MIGRATIONS ??
      String(process.env.NODE_ENV === 'production')) === 'true',
}));
