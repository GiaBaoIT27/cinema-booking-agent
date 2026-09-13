import { DataSource } from 'typeorm';
import { SeatType } from '#modules/seat-types/entities/seat-type.entity.js'; // Bạn nhớ điều chỉnh lại đường dẫn import cho đúng nhé

export class SeatTypeSeeder {
  async run(dataSource: DataSource): Promise<void> {
    const seatTypeRepository = dataSource.getRepository(SeatType);

    // 1. Định nghĩa danh sách 3 loại ghế phổ biến trong rạp phim (Thường, VIP, Đôi)
    const systemSeatTypes = [
      {
        id: '1',
        code: 'NORMAL',
        name: 'Ghế tiêu chuẩn',
        priceMultiplier: 1.0,
        surchargeAmount: 0.0,
        colorCode: '#C0C0C0', // Màu bạc tiêu chuẩn
        seatCount: 1,
        description:
          'Ghế đơn tiêu chuẩn, vị trí thoải mái phù hợp cho mọi khán giả.',
        displayOrder: 1,
      },
      {
        id: '2',
        code: 'VIP',
        name: 'Ghế VIP',
        priceMultiplier: 1.2, // Hệ số nhân giá 1.2
        surchargeAmount: 10000.0, // Phụ thu thêm 10,000 VND
        colorCode: '#FFD700', // Màu vàng Gold sang trọng
        seatCount: 1,
        description:
          'Ghế đơn VIP nằm ở khu vực trung tâm, góc nhìn và âm thanh tốt nhất rạp.',
        displayOrder: 2,
      },
      {
        id: '3',
        code: 'SWEETBOX',
        name: 'Ghế đôi (Sweetbox)',
        priceMultiplier: 2.0, // Chiếm 2 ghế nên hệ số nhân giá là 2.0
        surchargeAmount: 20000.0, // Phụ thu không gian riêng tư 20,000 VND
        colorCode: '#FF69B4', // Màu hồng lãng mạn cho cặp đôi
        seatCount: 2, // Ghế đôi tính là 2 vị trí ngồi
        description:
          'Ghế đôi có vách ngăn riêng tư ở hàng ghế cuối rạp, không gian hoàn hảo cho cặp đôi.',
        displayOrder: 3,
      },
    ];

    console.log('Khởi chạy quy trình Seeding cấu hình Loại Ghế (SeatTypes)...');

    // 2. Thực thi ghi dữ liệu lũy đẳng dựa trên trường duy nhất là "code"
    for (const typeData of systemSeatTypes) {
      const existingType = await seatTypeRepository.findOne({
        where: { code: typeData.code },
      });

      if (!existingType) {
        // Khởi tạo mới nếu mã ghế chưa tồn tại
        const newType = seatTypeRepository.create(typeData);
        await seatTypeRepository.save(newType);
        console.log(
          `Khởi tạo thành công loại ghế: [${typeData.code}] - ${typeData.name}`,
        );
      } else {
        // Đồng bộ/Cập nhật các cấu hình định mức giá nếu có thay đổi trong file seed
        existingType.name = typeData.name;
        existingType.priceMultiplier = typeData.priceMultiplier;
        existingType.surchargeAmount = typeData.surchargeAmount;
        existingType.colorCode = typeData.colorCode;
        existingType.seatCount = typeData.seatCount;
        existingType.description = typeData.description;
        existingType.displayOrder = typeData.displayOrder;

        await seatTypeRepository.save(existingType);
        console.log(
          `Cập nhật/Đồng bộ thành công loại ghế: [${typeData.code}] - ${typeData.name}`,
        );
      }
    }

    console.log('Hoàn thành Seeding danh mục Loại Ghế thành công!');
  }
}
