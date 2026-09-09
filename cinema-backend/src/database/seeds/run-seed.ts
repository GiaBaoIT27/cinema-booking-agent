import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '#src/app.module.js';
import { RoleSeeder } from './2-role.seed.js';
import { DistributorSeeder } from './5-distributor.seed.js';
import { PromotionSeeder } from './6-promotion.seed.js';
import { LocationSeeder } from './4-location.seed.js';
import { FnbItemSeeder } from './7-fnb-item.seed.js';
import { SeatTypeSeeder } from './8-seat-type.seed.js';
import { GenreSeeder } from './9-genre.seed.js';

async function runSeed() {
  console.log('[CLI] Khởi tạo kết nối hệ thống phục vụ Seeding...');

  // Khởi tạo Context độc lập (Không nạp HTTP Server, không mở cổng PORT)
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const dataSource = app.get(DataSource);

    // 1. Thực thi Seeder Role
    const roleSeeder = new RoleSeeder();
    await roleSeeder.run(dataSource);

    // 2. Thực thi Seeder Promotion
    const promotionSeeder = new PromotionSeeder();
    await promotionSeeder.run(dataSource);

    // 3. Thực thi Seeder Distributor
    const distributorSeeder = new DistributorSeeder();
    await distributorSeeder.run(dataSource);

    // 4. Thực thi Seeder Location
    const locationSeeder = new LocationSeeder();
    await locationSeeder.run(dataSource);

    // 5. Thực thi Seeder Fnb
    const fnbItemSeeder = new FnbItemSeeder();
    await fnbItemSeeder.run(dataSource);

    // 6. Thực thi Seeder cấu hình Loại Ghế
    const seatTypeSeeder = new SeatTypeSeeder();
    await seatTypeSeeder.run(dataSource);

    // 7. Thực thi Seeder danh mục Thể loại phim
    const genreSeeder = new GenreSeeder();
    await genreSeeder.run(dataSource); // Kích hoạt chạy seed genre tại đây

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
