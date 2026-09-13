import { DataSource } from 'typeorm';
import { Province } from '#modules/locations/entities/province.entity.js';
import { Ward } from '#modules/locations/entities/ward.entity.js';
import { ProvinceType } from '#modules/locations/enums/province-type.enum.js';
import { WardType } from '#modules/locations/enums/ward-type.enum.js';

export class LocationSeeder {
  async run(dataSource: DataSource): Promise<void> {
    const provinceRepository = dataSource.getRepository(Province);
    const wardRepository = dataSource.getRepository(Ward);

    // 1. Định nghĩa danh sách Tỉnh/Thành phố
    const systemProvinces = [
      {
        id: '1',
        code: '01', // Mã hành chính chuẩn của Hà Nội
        name: 'Thành phố Hà Nội',
        type: ProvinceType.CITY || 'CITY', // Tùy thuộc vào cách bạn đặt tên trong enum (Thành phố TW)
      },
      {
        id: '2',
        code: '79', // Mã hành chính chuẩn của TP.HCM
        name: 'Thành phố Hồ Chí Minh',
        type: ProvinceType.CITY || 'CITY',
      },
    ];

    // 2. Định nghĩa danh sách Phường/Xã gắn liền với ID của Province ở trên
    const systemWards = [
      // === Phường thuộc Hà Nội (provinceId: '1') ===
      {
        id: '1',
        provinceId: '1',
        code: '00001',
        name: 'Phường Phúc Xá',
        type: WardType.WARD || 'WARD',
      },
      {
        id: '2',
        provinceId: '1',
        code: '00004',
        name: 'Phường Đồng Xuân',
        type: WardType.WARD || 'WARD',
      },
      {
        id: '3',
        provinceId: '1',
        code: '00007',
        name: 'Phường Hàng Bạc',
        type: WardType.WARD || 'WARD',
      },

      // === Phường thuộc TP. Hồ Chí Minh (provinceId: '2') ===
      {
        id: '4',
        provinceId: '2',
        code: '26734',
        name: 'Phường Bến Nghé',
        type: WardType.WARD || 'WARD',
      },
      {
        id: '5',
        provinceId: '2',
        code: '26737',
        name: 'Phường Bến Thành',
        type: WardType.WARD || 'WARD',
      },
      {
        id: '6',
        provinceId: '2',
        code: '26740',
        name: 'Phường Nguyễn Thái Bình',
        type: WardType.WARD || 'WARD',
      },
    ];

    console.log('Khởi chạy quy trình Seeding Tỉnh/Thành phố (Provinces)...');

    // 3. Seed dữ liệu bảng Province (Lũy đẳng)
    for (const provData of systemProvinces) {
      const existingProvince = await provinceRepository.findOne({
        where: { code: provData.code },
      });

      if (!existingProvince) {
        const newProvince = provinceRepository.create(provData);
        await provinceRepository.save(newProvince);
        console.log(`Khởi tạo thành công tỉnh/thành phố: ${provData.name}`);
      } else {
        existingProvince.name = provData.name;
        existingProvince.type = provData.type as any;
        await provinceRepository.save(existingProvince);
        console.log(
          `Cập nhật/Đồng bộ thành công tỉnh/thành phố: ${provData.name}`,
        );
      }
    }

    console.log('Khởi chạy quy trình Seeding Phường/Xã (Wards)...');

    // 4. Seed dữ liệu bảng Ward (Lũy đẳng)
    for (const wardData of systemWards) {
      const existingWard = await wardRepository.findOne({
        where: { code: wardData.code },
      });

      if (!existingWard) {
        const newWard = wardRepository.create(wardData);
        await wardRepository.save(newWard);
        console.log(`Khởi tạo thành công phường/xã: ${wardData.name}`);
      } else {
        existingWard.name = wardData.name;
        existingWard.provinceId = wardData.provinceId;
        existingWard.type = wardData.type as any;
        await wardRepository.save(existingWard);
        console.log(`Cập nhật/Đồng bộ thành công phường/xã: ${wardData.name}`);
      }
    }

    console.log('Hoàn thành Seeding danh mục Vị trí địa lý thành công!');
  }
}
