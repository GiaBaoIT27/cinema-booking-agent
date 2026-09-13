import { DataSource } from 'typeorm';
import { FnbItem } from '#modules/fnb/entities/fnb-item.entities.js'; // Bạn nhớ kiểm tra lại đường dẫn import entity này nhé
import { FnbItemType } from '#modules/fnb/enums/fnb-item-type.enum.js';
import { FnbCategory } from '#modules/fnb/enums/fnb-category.enum.js';

export class FnbItemSeeder {
  async run(dataSource: DataSource): Promise<void> {
    const fnbItemRepository = dataSource.getRepository(FnbItem);

    // 1. Định nghĩa danh sách 5 món bắp nước (Single & Combo) phục vụ cụm rạp phim
    const systemFnbItems = [
      {
        id: '1',
        sku: 'FNB-POP-SWE',
        name: 'Bắp Rang Ngọt (Cỡ Vừa)',
        type: FnbItemType.SINGLE || 'SINGLE',
        category: FnbCategory.POPCORN || 'POPCORN',
        unit: 'HỘP',
        basePrice: 45000.0,
        imageUrl: 'https://example.com',
        description: 'Bắp rang bơ vị ngọt truyền thống thơm lừng, giòn rụm.',
        isActive: true,
      },
      {
        id: '2',
        sku: 'FNB-POP-CHE',
        name: 'Bắp Rang Phô Mai (Cỡ Vừa)',
        type: FnbItemType.SINGLE || 'SINGLE',
        category: FnbCategory.POPCORN || 'POPCORN',
        unit: 'HỘP',
        basePrice: 55000.0,
        imageUrl: 'https://example.com',
        description: 'Bắp rang lắc bột phô mai nhập khẩu đậm đà.',
        isActive: true,
      },
      {
        id: '3',
        sku: 'FNB-DRK-COCA',
        name: 'Coca Cola (Cỡ Lớn)',
        type: FnbItemType.SINGLE || 'SINGLE',
        category: FnbCategory.BEVERAGE || 'BEVERAGE',
        unit: 'LY',
        basePrice: 35000.0,
        imageUrl: 'https://example.com',
        description: 'Nước ngọt có ga Coca Cola mát lạnh sảng khoái.',
        isActive: true,
      },
      {
        id: '4',
        sku: 'FNB-CBO-SOLO',
        name: 'Combo Solo (1 Bắp + 1 Nước)',
        type: FnbItemType.COMBO || 'COMBO',
        category: FnbCategory.COMBO || 'COMBO',
        unit: 'PHẦN',
        basePrice: 75000.0,
        imageUrl: 'https://example.com',
        description:
          'Phần ăn tiết kiệm dành cho 1 người gồm: 1 bắp ngọt vừa và 1 ly nước tùy chọn.',
        isActive: true,
      },
      {
        id: '5',
        sku: 'FNB-CBO-COUPLE',
        name: 'Combo Couple (1 Bắp Lớn + 2 Nước)',
        type: FnbItemType.COMBO || 'COMBO',
        category: FnbCategory.COMBO || 'COMBO',
        unit: 'PHẦN',
        basePrice: 109000.0,
        imageUrl: 'https://example.com',
        description:
          'Combo hoàn hảo cho cặp đôi gồm: 1 bắp lớn tùy chọn vị và 2 ly nước ngọt lớn.',
        isActive: true,
      },
    ];

    console.log('Khởi chạy quy trình Seeding danh mục Bắp Nước (FnbItems)...');

    // 2. Thực thi ghi dữ liệu lũy đẳng để không bị ghi đè hay lỗi Unique Constraint (sku/name)
    for (const itemData of systemFnbItems) {
      // Kiểm tra thực thể tồn tại thông qua mã duy nhất SKU
      const existingItem = await fnbItemRepository.findOne({
        where: { sku: itemData.sku },
      });

      if (!existingItem) {
        // Tạo mới dữ liệu nếu SKU chưa hiện diện trong DB
        const newItem = fnbItemRepository.create(itemData);
        await fnbItemRepository.save(newItem);
        console.log(
          `Khởi tạo thành công món FnB: [${itemData.sku}] - ${itemData.name}`,
        );
      } else {
        // Cập nhật lại thông số và giá cả nếu file cấu hình seed thay đổi thông tin
        existingItem.name = itemData.name;
        existingItem.type = itemData.type as any;
        existingItem.category = itemData.category as any;
        existingItem.unit = itemData.unit;
        existingItem.basePrice = itemData.basePrice;
        existingItem.imageUrl = itemData.imageUrl;
        existingItem.description = itemData.description;
        existingItem.isActive = itemData.isActive;

        await fnbItemRepository.save(existingItem);
        console.log(
          `Cập nhật/Đồng bộ thành công món FnB: [${itemData.sku}] - ${itemData.name}`,
        );
      }
    }

    console.log('Hoàn thành Seeding danh mục Bắp Nước thành công!');
  }
}
