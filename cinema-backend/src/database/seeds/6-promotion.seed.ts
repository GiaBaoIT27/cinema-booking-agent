import { DataSource } from 'typeorm';
import { PromotionEntity } from '#modules/promotions/entities/promotion.entity.js'; // Bạn nhớ kiểm tra lại đường dẫn import entity này nhé
import { DiscountType } from '#modules/promotions/enums/promotion.enum.js';

export class PromotionSeeder {
  async run(dataSource: DataSource): Promise<void> {
    const promotionRepository = dataSource.getRepository(PromotionEntity);

    const now = new Date();
    const futureDate = new Date();
    futureDate.setMonth(now.getMonth() + 3); // Hết hạn sau 3 tháng

    // 1. Định nghĩa danh sách 10 mã giảm giá (5 percentage và 5 fixed_amount) kèm ID cứng dạng chuỗi
    const systemPromotions = [
      // === 5 Mã dạng PERCENTAGE ===
      {
        id: '1',
        code: 'SALE10',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10.0,
        maxDiscountAmount: 50000.0,
        minOrderAmount: 100000.0,
        usageLimit: 100,
        usedCount: 0,
        startDate: now,
        endDate: futureDate,
        isActive: true,
      },
      {
        id: '2',
        code: 'WELCOME20',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20.0,
        maxDiscountAmount: 30000.0,
        minOrderAmount: 0.0,
        usageLimit: 500,
        usedCount: 12,
        startDate: now,
        endDate: futureDate,
        isActive: true,
      },
      {
        id: '3',
        code: 'BLACKFRIDAY',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 50.0,
        maxDiscountAmount: 200000.0,
        minOrderAmount: 300000.0,
        usageLimit: 50,
        usedCount: 0,
        startDate: now,
        endDate: futureDate,
        isActive: true,
      },
      {
        id: '4',
        code: 'MIDYEAR',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 15.0,
        maxDiscountAmount: 100000.0,
        minOrderAmount: 150000.0,
        usageLimit: null,
        usedCount: 45,
        startDate: now,
        endDate: futureDate,
        isActive: true,
      },
      {
        id: '5',
        code: 'EXPIRED5',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 5.0,
        maxDiscountAmount: 15000.0,
        minOrderAmount: 50000.0,
        usageLimit: 10,
        usedCount: 10,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-02-01'),
        isActive: false,
      },

      // === 5 Mã dạng FIXED_AMOUNT ===
      {
        id: '6',
        code: 'REDUCE20K',
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 20000.0,
        maxDiscountAmount: null,
        minOrderAmount: 50000.0,
        usageLimit: 200,
        usedCount: 5,
        startDate: now,
        endDate: futureDate,
        isActive: true,
      },
      {
        id: '7',
        code: 'REDUCE50K',
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 50000.0,
        maxDiscountAmount: null,
        minOrderAmount: 200000.0,
        usageLimit: 100,
        usedCount: 0,
        startDate: now,
        endDate: futureDate,
        isActive: true,
      },
      {
        id: '8',
        code: 'REDUCE100K',
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 100000.0,
        maxDiscountAmount: null,
        minOrderAmount: 500000.0,
        usageLimit: 50,
        usedCount: 2,
        startDate: now,
        endDate: futureDate,
        isActive: true,
      },
      {
        id: '9',
        code: 'VIP1M',
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 1000000.0,
        maxDiscountAmount: null,
        minOrderAmount: 5000000.0,
        usageLimit: 5,
        usedCount: 0,
        startDate: now,
        endDate: futureDate,
        isActive: true,
      },
      {
        id: '10',
        code: 'FREESHIP25K',
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 25000.0,
        maxDiscountAmount: null,
        minOrderAmount: 99000.0,
        usageLimit: 1000,
        usedCount: 150,
        startDate: now,
        endDate: futureDate,
        isActive: true,
      },
    ];

    console.log(
      'Khởi chạy quy trình Seeding danh mục Mã giảm giá (Promotions)...',
    );

    // 2. Thực thi ghi dữ liệu lũy đẳng (Vòng lặp chống crash dữ liệu khi chạy lại nhiều lần)
    for (const promoData of systemPromotions) {
      // Kiểm tra xem mã code ưu đãi này đã tồn tại dưới DB chưa
      const existingPromo = await promotionRepository.findOne({
        where: { code: promoData.code },
      });

      if (!existingPromo) {
        // Tạo mới nếu chưa tồn tại (Ép ID chuỗi phục vụ hạ tầng cột bigint Postgres tương tự Role)
        const newPromo = promotionRepository.create(promoData);
        await promotionRepository.save(newPromo);
        console.log(`Khởi tạo thành công promotion: ${promoData.code}`);
      } else {
        // Đồng bộ/Cập nhật lại các thông số cấu hình nếu có sự thay đổi trong file seed
        existingPromo.discountType = promoData.discountType;
        existingPromo.discountValue = promoData.discountValue;
        existingPromo.maxDiscountAmount = promoData.maxDiscountAmount;
        existingPromo.minOrderAmount = promoData.minOrderAmount;
        existingPromo.usageLimit = promoData.usageLimit;
        existingPromo.startDate = promoData.startDate;
        existingPromo.endDate = promoData.endDate;
        existingPromo.isActive = promoData.isActive;

        await promotionRepository.save(existingPromo);
        console.log(`Cập nhật/Đồng bộ thành công promotion: ${promoData.code}`);
      }
    }

    console.log('Hoàn thành Seeding danh mục Mã giảm giá thành công!');
  }
}
