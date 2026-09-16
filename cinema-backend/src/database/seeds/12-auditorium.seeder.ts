import { DataSource } from 'typeorm';
import { Auditorium } from '#modules/cinemas/entities/auditorium.entity.js';
import { Cineplex } from '#modules/cinemas/entities/cineplex.entity.js';
import { AuditoriumStatus } from '#modules/cinemas/enums/auditorium-status.enum.js';
import { ScreenType } from '#modules/cinemas/enums/screen-type.enum.js';

export class AuditoriumSeeder {
  async run(dataSource: DataSource): Promise<void> {
    const cineplexRepository = dataSource.getRepository(Cineplex);
    const auditoriumRepository = dataSource.getRepository(Auditorium);

    console.log('Khởi chạy quy trình Seeding Phòng chiếu (Auditoriums)...');

    // 1. Lấy danh sách toàn bộ Cụm rạp từ Database
    const cineplexes = await cineplexRepository.find();

    if (cineplexes.length === 0) {
      console.warn(
        ' Không tìm thấy cụm rạp nào. Vui lòng chạy CineplexSeeder trước!',
      );
      return;
    }

    // 2. Lặp qua từng Cụm rạp và tạo 2 phòng chiếu tương ứng
    for (const cineplex of cineplexes) {
      const auditoriumsData = [
        {
          code: `${cineplex.code}-HALL-01`,
          name: 'Phòng 01 - Standard Surround',
          screenType: ScreenType.STANDARD || 'STANDARD',
          audioType: '7.1_SURROUND',
          totalSeats: 120,
          status: AuditoriumStatus.ACTIVE || 'ACTIVE',
          cineplexId: cineplex.id,
        },
        {
          code: `${cineplex.code}-HALL-02`,
          // Phân loại phòng VIP/Đặc biệt tùy theo khu vực
          name:
            cineplex.code.includes('BENNGHE') ||
            cineplex.code.includes('PHUCXA')
              ? 'Phòng 02 - IMAX Dolby Atmos'
              : 'Phòng 02 - 4DX Dynamic Experience',
          screenType:
            cineplex.code.includes('BENNGHE') ||
            cineplex.code.includes('PHUCXA')
              ? ScreenType.IMAX || 'IMAX'
              : ScreenType.DX || '4DX',
          audioType: 'DOLBY_ATMOS',
          totalSeats: 80,
          status: AuditoriumStatus.ACTIVE || 'ACTIVE',
          cineplexId: cineplex.id,
        },
      ];

      // 3. Lưu/Đồng bộ từng phòng chiếu (Lũy đẳng - Idempotent)
      for (const audData of auditoriumsData) {
        const existingAuditorium = await auditoriumRepository.findOne({
          where: {
            cineplexId: cineplex.id,
            code: audData.code,
          },
        });

        if (!existingAuditorium) {
          const newAuditorium = auditoriumRepository.create(audData);
          await auditoriumRepository.save(newAuditorium);
          console.log(
            `+ Tạo phòng chiếu: [${audData.name}] thuộc rạp [${cineplex.name}]`,
          );
        } else {
          existingAuditorium.name = audData.name;
          existingAuditorium.screenType = audData.screenType as any;
          existingAuditorium.audioType = audData.audioType;
          existingAuditorium.totalSeats = audData.totalSeats;
          existingAuditorium.status = audData.status as any;

          await auditoriumRepository.save(existingAuditorium);
          console.log(
            `~ Đồng bộ phòng chiếu: [${audData.name}] thuộc rạp [${cineplex.name}]`,
          );
        }
      }
    }

    console.log(
      'Hoàn thành Seeding danh mục Phòng chiếu (Auditoriums) thành công!',
    );
  }
}
