import { DataSource } from 'typeorm';
import { Distributor } from '#modules/distributors/entities/distributor.entity.js'; // Điều chỉnh lại đường dẫn cho đúng entity của bạn
import { DistributorStatus } from '#modules/distributors/enums/distributor-status.enum.js';

export class DistributorSeeder {
  async run(dataSource: DataSource): Promise<void> {
    const distributorRepository = dataSource.getRepository(Distributor);

    // 1. Định nghĩa danh sách 5 nhà phát hành phim lớn tại Việt Nam
    const systemDistributors = [
      {
        id: '1',
        name: 'Công ty TNHH CJ CGV Việt Nam',
        taxCode: '0304674647',
        address:
          'Tầng 5, Toà nhà lndochina Plaza Hanoi, 241 Xuân Thủy, Cầu Giấy, Hà Nội',
        contactPerson: 'Nguyễn Văn A',
        contactEmail: 'cjcgv.distribution@cj.net',
        contactPhone: '02437554221',
        bankAccountNumber: '19020456789012',
        bankName: 'Techcombank',
        status: DistributorStatus.ACTIVE,
      },
      {
        id: '2',
        name: 'Công ty Cổ phần Phim Thiên Ngân (Galaxy Studio)',
        taxCode: '0302943152',
        address: '63A Võ Văn Tần, Phường Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh',
        contactPerson: 'Trần Thị B',
        contactEmail: 'galaxy.distribution@galaxy.com.vn',
        contactPhone: '02839301438',
        bankAccountNumber: '0071001234567',
        bankName: 'Vietcombank',
        status: DistributorStatus.ACTIVE,
      },
      {
        id: '3',
        name: 'Công ty TNHH Truyền thông BHD',
        taxCode: '0303124567',
        address:
          'Tầng 4, TTTM Vincom Quang Trung, 190 Quang Trung, Gò Vấp, TP. Hồ Chí Minh',
        contactPerson: 'Lê Hoàng C',
        contactEmail: 'bhdstar.distribution@bhd.vn',
        contactPhone: '02837752524',
        bankAccountNumber: '110000123456',
        bankName: 'VietinBank',
        status: DistributorStatus.ACTIVE,
      },
      {
        id: '4',
        name: 'Công ty TNHH Lotte Cinema Việt Nam',
        taxCode: '0306123987',
        address:
          'Tầng 3, Lotte Mart Quận 7, 469 Nguyễn Hữu Thọ, Tân Hưng, Quận 7, TP. Hồ Chí Minh',
        contactPerson: 'Phạm Minh D',
        contactEmail: 'lotte distribution@lotte.vn',
        contactPhone: '02837752520',
        bankAccountNumber: '0101234567',
        bankName: 'MB Bank',
        status: DistributorStatus.ACTIVE,
      },
      {
        id: '5',
        name: 'Công ty Cổ phần Truyền thông và Giải trí Beta (Beta Media)',
        taxCode: '0106634512',
        address: 'Tầng 5, Tòa nhà HCO, 44B Lý Thường Kiệt, Hoàn Kiếm, Hà Nội',
        contactPerson: 'Vũ Thùy E',
        contactEmail: 'betamedia.distribution@beta.vn',
        contactPhone: '02473028885',
        bankAccountNumber: '1022345678',
        bankName: 'BIDV',
        status: DistributorStatus.ACTIVE,
      },
    ];

    console.log(
      'Khởi chạy quy trình Seeding danh mục Nhà phát hành (Distributors)...',
    );

    // 2. Ghi dữ liệu lũy đẳng (Chống trùng lặp hoặc crash lỗi khi chạy lại)
    for (const distData of systemDistributors) {
      // Kiểm tra sự tồn tại dựa trên trường duy nhất (taxCode hoặc name)
      const existingDist = await distributorRepository.findOne({
        where: { taxCode: distData.taxCode },
      });

      if (!existingDist) {
        // Khởi tạo mới nếu chưa có
        const newDist = distributorRepository.create(distData);
        await distributorRepository.save(newDist);
        console.log(`Khởi tạo thành công nhà phát hành: ${distData.name}`);
      } else {
        // Đồng bộ dữ liệu cũ nếu file seed có cập nhật chỉnh sửa thông tin
        existingDist.name = distData.name;
        existingDist.address = distData.address;
        existingDist.contactPerson = distData.contactPerson;
        existingDist.contactEmail = distData.contactEmail;
        existingDist.contactPhone = distData.contactPhone;
        existingDist.bankAccountNumber = distData.bankAccountNumber;
        existingDist.bankName = distData.bankName;
        existingDist.status = distData.status;

        await distributorRepository.save(existingDist);
        console.log(
          `Cập nhật/Đồng bộ thành công nhà phát hành: ${distData.name}`,
        );
      }
    }

    console.log('Hoàn thành Seeding danh mục Nhà phát hành thành công!');
  }
}
