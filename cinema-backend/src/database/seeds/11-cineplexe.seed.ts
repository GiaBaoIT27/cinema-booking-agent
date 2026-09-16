import { DataSource } from 'typeorm';
import { Cineplex } from '#modules/cinemas/entities/cineplex.entity.js'; // Điều chỉnh đường dẫn theo dự án của bạn
import { CineplexStatus } from '#modules/cinemas/enums/cineplex-status.enum.js';

export class CineplexSeeder {
  async run(dataSource: DataSource): Promise<void> {
    const cineplexRepository = dataSource.getRepository(Cineplex);

    // 1. Định nghĩa 6 cụm rạp (3 tại Hà Nội, 3 tại TP.HCM)
    const systemCineplexes = [
      // CÁC CỤM RẠP TẠI HÀ NỘI (provinceId: '1')
      {
        code: 'CPX-HN-PHUCXA',
        name: 'Cinema Star - Phúc Xá',
        provinceId: 1,
        wardId: 1, // Phường Phúc Xá
        address: 'Số 123 Đường Hồng Hà, Phường Phúc Xá',
        latitude: 21.0425,
        longitude: 105.8485,
        phoneNumber: '02439991001',
        status: CineplexStatus.ACTIVE || 'ACTIVE',
      },
      {
        code: 'CPX-HN-DONGXUAN',
        name: 'Cinema Star - Đồng Xuân',
        provinceId: 1,
        wardId: 2, // Phường Đồng Xuân
        address: 'Số 45 Phố Đồng Xuân, Phường Đồng Xuân',
        latitude: 21.0378,
        longitude: 105.8492,
        phoneNumber: '02439991002',
        status: CineplexStatus.ACTIVE || 'ACTIVE',
      },
      {
        code: 'CPX-HN-HANGBAC',
        name: 'Cinema Star - Phố Cổ Hàng Bạc',
        provinceId: 1,
        wardId: 3, // Phường Hàng Bạc
        address: 'Số 88 Phố Hàng Bạc, Phường Hàng Bạc',
        latitude: 21.0335,
        longitude: 105.8521,
        phoneNumber: '02439991003',
        status: CineplexStatus.ACTIVE || 'ACTIVE',
      },
      // CÁC CỤM RẠP TẠI TP. HỒ CHÍ MINH (provinceId: '2')
      {
        code: 'CPX-HCM-BENNGHE',
        name: 'Cinema Star - Bến Nghé Plaza',
        provinceId: 2,
        wardId: 4, // Phường Bến Nghé
        address: 'Số 68 Đường Lê Duẩn, Phường Bến Nghé',
        latitude: 10.7812,
        longitude: 106.6991,
        phoneNumber: '02839992001',
        status: CineplexStatus.ACTIVE || 'ACTIVE',
      },
      {
        code: 'CPX-HCM-BENTHANH',
        name: 'Cinema Star - Bến Thành',
        provinceId: 2,
        wardId: 5, // Phường Bến Thành
        address: 'Số 12 Đường Lê Thánh Tôn, Phường Bến Thành',
        latitude: 10.7721,
        longitude: 106.6983,
        phoneNumber: '02839992002',
        status: CineplexStatus.ACTIVE || 'ACTIVE',
      },
      {
        code: 'CPX-HCM-NTBINH',
        name: 'Cinema Star - Nguyễn Thái Bình',
        provinceId: 2,
        wardId: 6, // Phường Nguyễn Thái Bình
        address: 'Số 99 Đường Nguyễn Công Trứ, Phường Nguyễn Thái Bình',
        latitude: 10.7689,
        longitude: 106.7015,
        phoneNumber: '02839992003',
        status: CineplexStatus.ACTIVE || 'ACTIVE',
      },
    ];

    console.log('Khởi chạy quy trình Seeding Cụm rạp (Cineplexes)...');

    // 2. Thực hiện ghi/đồng bộ dữ liệu Lũy đẳng (Idempotent)
    for (const cpxData of systemCineplexes) {
      const existingCineplex = await cineplexRepository.findOne({
        where: { code: cpxData.code },
      });

      if (!existingCineplex) {
        const newCineplex = cineplexRepository.create(cpxData);
        await cineplexRepository.save(newCineplex);
        console.log(
          `+ Khởi tạo thành công cụm rạp: ${cpxData.name} (${cpxData.code})`,
        );
      } else {
        // Cập nhật thông tin nếu đã tồn tại để luôn giữ dữ liệu mới nhất
        existingCineplex.name = cpxData.name;
        existingCineplex.provinceId = cpxData.provinceId;
        existingCineplex.wardId = cpxData.wardId;
        existingCineplex.address = cpxData.address;
        existingCineplex.latitude = cpxData.latitude;
        existingCineplex.longitude = cpxData.longitude;
        existingCineplex.phoneNumber = cpxData.phoneNumber;
        existingCineplex.status = cpxData.status as any;

        await cineplexRepository.save(existingCineplex);
        console.log(
          `~ Đồng bộ thành công cụm rạp: ${cpxData.name} (${cpxData.code})`,
        );
      }
    }

    console.log('Hoàn thành Seeding danh mục Cụm rạp (Cineplexes) thành công!');
  }
}
