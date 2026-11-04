import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const srcDir = fileURLToPath(new URL('./src/', import.meta.url));

/**
 * Integration test chạy trên Postgres THẬT (database riêng, mặc định `cinema_test`).
 * Yêu cầu: `docker compose up -d postgres` (hoặc Postgres local) – xem DB_* trong .env.
 */
export default defineConfig({
  resolve: {
    // Ép #src/#modules trỏ vào src/ (package.json "imports" trỏ dist/ – nạp entity 2 lần
    // từ 2 nơi khiến TypeORM không khớp metadata quan hệ).
    alias: [
      { find: /^#modules\/(.*)\.js$/, replacement: `${srcDir}modules/$1.ts` },
      { find: /^#src\/(.*)\.js$/, replacement: `${srcDir}$1.ts` },
    ],
  },
  test: {
    globals: true,
    include: ['src/**/*.int-spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
