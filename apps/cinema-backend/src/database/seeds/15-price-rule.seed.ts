import { DataSource, IsNull } from 'typeorm';
import { PriceRule } from '#modules/showtimes/entities/price-rules.entity.js'; // Điều chỉnh đường dẫn theo dự án của bạn
import { Cineplex } from '#modules/cinemas/entities/cineplex.entity.js';
import { ProjectionType } from '#modules/showtimes/enums/projection-type.enum.js';
import { DayType } from '#modules/showtimes/enums/day-type.enum.js'; // Điều chỉnh đường dẫn enum DayType của bạn

export class PriceRuleSeeder {
  async run(dataSource: DataSource): Promise<void> {
    const priceRuleRepository = dataSource.getRepository(PriceRule);
    const cineplexRepository = dataSource.getRepository(Cineplex);

    console.log('Khởi chạy quy trình Seeding Quy tắc giá vé (Price Rules)...');

    // 1. Lấy danh sách Rạp chiếu để tạo cấu hình giá riêng cho rạp cụ thể (nếu cần)
    const cineplexes = await cineplexRepository.find();

    // 2. Định nghĩa danh sách các quy tắc giá (Price Rules)
    const globalPriceRules = [
      // =========================================================================
      // 1. ĐỊNH DẠNG 2D - NGÀY THƯỜNG (WEEKDAY)
      // =========================================================================
      {
        cineplexId: null, // Toàn hệ thống
        projectionType: ProjectionType.TWO_D || '2D',
        dayType: DayType.WEEKDAY || 'WEEKDAY',
        startTime: '08:00:00',
        endTime: '12:00:00',
        basePrice: 65000, // Suất sáng / Early Bird
      },
      {
        cineplexId: null,
        projectionType: ProjectionType.TWO_D || '2D',
        dayType: DayType.WEEKDAY || 'WEEKDAY',
        startTime: '12:00:00',
        endTime: '17:00:00',
        basePrice: 80000, // Suất chiều
      },
      {
        cineplexId: null,
        projectionType: ProjectionType.TWO_D || '2D',
        dayType: DayType.WEEKDAY || 'WEEKDAY',
        startTime: '17:00:00',
        endTime: '23:00:00',
        basePrice: 95000, // Khung giờ vàng (Prime Time)
      },
      {
        cineplexId: null,
        projectionType: ProjectionType.TWO_D || '2D',
        dayType: DayType.WEEKDAY || 'WEEKDAY',
        startTime: '23:00:00',
        endTime: '23:59:59',
        basePrice: 70000, // Suất khuya
      },

      // =========================================================================
      // 2. ĐỊNH DẠNG 2D - CUỐI TUẦN (WEEKEND)
      // =========================================================================
      {
        cineplexId: null,
        projectionType: ProjectionType.TWO_D || '2D',
        dayType: DayType.WEEKEND || 'WEEKEND',
        startTime: '08:00:00',
        endTime: '12:00:00',
        basePrice: 85000,
      },
      {
        cineplexId: null,
        projectionType: ProjectionType.TWO_D || '2D',
        dayType: DayType.WEEKEND || 'WEEKEND',
        startTime: '12:00:00',
        endTime: '17:00:00',
        basePrice: 105000,
      },
      {
        cineplexId: null,
        projectionType: ProjectionType.TWO_D || '2D',
        dayType: DayType.WEEKEND || 'WEEKEND',
        startTime: '17:00:00',
        endTime: '23:00:00',
        basePrice: 120000, // Giờ vàng cuối tuần
      },
      {
        cineplexId: null,
        projectionType: ProjectionType.TWO_D || '2D',
        dayType: DayType.WEEKEND || 'WEEKEND',
        startTime: '23:00:00',
        endTime: '23:59:59',
        basePrice: 90000,
      },

      // =========================================================================
      // 3. ĐỊNH DẠNG 3D (WEEKDAY & WEEKEND)
      // =========================================================================
      {
        cineplexId: null,
        projectionType: ProjectionType.THREE_D || '3D',
        dayType: DayType.WEEKDAY || 'WEEKDAY',
        startTime: '08:00:00',
        endTime: '17:00:00',
        basePrice: 110000,
      },
      {
        cineplexId: null,
        projectionType: ProjectionType.THREE_D || '3D',
        dayType: DayType.WEEKDAY || 'WEEKDAY',
        startTime: '17:00:00',
        endTime: '23:59:59',
        basePrice: 130000,
      },
      {
        cineplexId: null,
        projectionType: ProjectionType.THREE_D || '3D',
        dayType: DayType.WEEKEND || 'WEEKEND',
        startTime: '08:00:00',
        endTime: '23:59:59',
        basePrice: 150000,
      },

      // =========================================================================
      // 4. ĐỊNH DẠNG IMAX & 4DX
      // =========================================================================
      {
        cineplexId: null,
        projectionType: ProjectionType.IMAX || 'IMAX',
        dayType: DayType.WEEKDAY || 'WEEKDAY',
        startTime: '08:00:00',
        endTime: '23:59:59',
        basePrice: 160000,
      },
      {
        cineplexId: null,
        projectionType: ProjectionType.IMAX || 'IMAX',
        dayType: DayType.WEEKEND || 'WEEKEND',
        startTime: '08:00:00',
        endTime: '23:59:59',
        basePrice: 200000,
      },
      {
        cineplexId: null,
        projectionType: ProjectionType.FOUR_DX || '4DX',
        dayType: DayType.WEEKDAY || 'WEEKDAY',
        startTime: '08:00:00',
        endTime: '23:59:59',
        basePrice: 170000,
      },
      {
        cineplexId: null,
        projectionType: ProjectionType.FOUR_DX || '4DX',
        dayType: DayType.WEEKEND || 'WEEKEND',
        startTime: '08:00:00',
        endTime: '23:59:59',
        basePrice: 220000,
      },
    ];

    // 3. Quy tắc giá ĐẶC THÙ áp dụng riêng cho 1 Rạp cụ thể (Cineplex-specific)
    const customCineplexRules = [];
    if (cineplexes.length > 0) {
      const targetCineplex = cineplexes[0]; // Giả định rạp đầu tiên là rạp trung tâm cao cấp

      customCineplexRules.push(
        {
          cineplexId: targetCineplex.id, // Áp dụng riêng cho rạp này
          projectionType: ProjectionType.TWO_D || '2D',
          dayType: DayType.WEEKDAY || 'WEEKDAY',
          startTime: '17:00:00',
          endTime: '23:00:00',
          basePrice: 110000, // Đắt hơn giá chung 95,000
        },
        {
          cineplexId: targetCineplex.id,
          projectionType: ProjectionType.TWO_D || '2D',
          dayType: DayType.WEEKEND || 'WEEKEND',
          startTime: '17:00:00',
          endTime: '23:00:00',
          basePrice: 140000, // Đắt hơn giá chung 120,000
        },
      );
    }

    const allRules = [...globalPriceRules, ...customCineplexRules];

    // 4. Thực thi ghi dữ liệu Lũy đẳng (Idempotent)
    for (const ruleData of allRules) {
      // Dùng IsNull() của TypeORM nếu cineplexId là null để tạo query "WHERE cineplex_id IS NULL" chuẩn SQL
      const existingRule = await priceRuleRepository.findOne({
        where: {
          cineplexId: ruleData.cineplexId ? ruleData.cineplexId : IsNull(),
          projectionType: ruleData.projectionType as any,
          dayType: ruleData.dayType as any,
          startTime: ruleData.startTime,
          endTime: ruleData.endTime,
        },
      });

      if (!existingRule) {
        const newRule = priceRuleRepository.create(ruleData);
        await priceRuleRepository.save(newRule);

        const scopeLabel = ruleData.cineplexId
          ? `Rạp ID: ${ruleData.cineplexId}`
          : 'Toàn hệ thống';
        console.log(
          `+ Khởi tạo PriceRule [${scopeLabel}]: ${ruleData.projectionType} | ${ruleData.dayType} | ${ruleData.startTime}-${ruleData.endTime} => ${ruleData.basePrice.toLocaleString('vi-VN')} VNĐ`,
        );
      } else {
        existingRule.basePrice = ruleData.basePrice;
        await priceRuleRepository.save(existingRule);

        const scopeLabel = ruleData.cineplexId
          ? `Rạp ID: ${ruleData.cineplexId}`
          : 'Toàn hệ thống';
        console.log(
          `~ Cập nhật PriceRule [${scopeLabel}]: ${ruleData.projectionType} | ${ruleData.dayType} | ${ruleData.startTime}-${ruleData.endTime} => ${ruleData.basePrice.toLocaleString('vi-VN')} VNĐ`,
        );
      }
    }

    console.log('Hoàn thành Seeding Quy tắc giá vé (Price Rules) thành công!');
  }
}
