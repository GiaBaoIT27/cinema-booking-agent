import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module.js';
import { RoleSeeder } from './2-role.seed.js';

async function runSeed() {
  console.log('[CLI] Khởi tạo kết nối hệ thống phục vụ Seeding...');

  // Khởi tạo Context độc lập (Không nạp HTTP Server, không mở cổng PORT)
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const dataSource = app.get(DataSource);

    // Thực thi Seeder
    const roleSeeder = new RoleSeeder();
    await roleSeeder.run(dataSource);

    console.log('[CLI] Quá trình Seeding hoàn thành!');
  } catch (error) {
    console.error('[CLI] Đã xảy ra lỗi nghiêm trọng khi chạy Seeding:', error);
    process.exit(1);
  } finally {
    // Bắt buộc phải đóng kết nối Database và giải phóng bộ nhớ
    await app.close();
    console.log('[CLI] Đã ngắt kết nối an toàn.');
    process.exit(0);
  }
}

await runSeed();
