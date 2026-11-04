import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const srcDir = fileURLToPath(new URL('./src/', import.meta.url));

export default defineConfig({
  resolve: {
    // Ép #src/#modules trỏ vào src/. Nếu không, "imports" trong package.json trỏ sang dist/
    // => test chạy trên bản build CŨ thay vì code đang sửa.
    alias: [
      { find: /^#modules\/(.*)\.js$/, replacement: `${srcDir}modules/$1.ts` },
      { find: /^#src\/(.*)\.js$/, replacement: `${srcDir}$1.ts` },
    ],
  },
  test: {
    globals: true,
    include: ['src/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.ts'],
  },
});
