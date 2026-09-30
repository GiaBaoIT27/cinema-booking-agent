import { DataSource } from 'typeorm';
import { Role } from '#modules/rbac/domain/entities/role.entity.js';
import { RoleCode } from '#modules/rbac/domain/enums/role.enum.js';

export class RoleSeeder {
  async run(dataSource: DataSource): Promise<void> {
    const roleRepository = dataSource.getRepository(Role);

    // 1. Định nghĩa danh sách 5 vai trò hệ thống cốt lõi theo đúng đặc tả nghiệp vụ
    const systemRoles = [
      {
        id: '1', // Ép ID cứng dạng chuỗi phục vụ hạ tầng cột bigint Postgres
        code: RoleCode.SUPER_ADMIN || 'SUPER_ADMIN',
        name: 'Quản trị viên hệ thống',
        description:
          'Toàn quyền truy cập, cấu hình bảo mật và điều hành toàn bộ chuỗi hệ thống rạp phim.',
        isSystem: true,
      },
      {
        id: '2',
        code: RoleCode.CINEMA_MANAGER || 'CINEMA_MANAGER',
        name: 'Quản lý Cụm Rạp',
        description:
          'Quản lý lịch chiếu, điều phối nhân sự, phòng chiếu và doanh thu tại cụm rạp được phân công.',
        isSystem: true,
      },
      {
        id: '3',
        code: RoleCode.CINEMA_STAFF || 'CINEMA_STAFF',
        name: 'Nhân viên Soát vé / Cụm rạp',
        description:
          'Thực hiện quét mã vé, hỗ trợ khách hàng vào phòng chiếu và tác nghiệp tại rạp cụ thể.',
        isSystem: true,
      },
      {
        id: '4',
        code: RoleCode.AI_AGENT || 'AI_AGENT',
        name: 'Trợ lý Kỹ thuật số AI',
        description:
          'Tài khoản dịch vụ dành cho hệ thống AI Agent quét phân tích dữ liệu và tối ưu lịch chiếu.',
        isSystem: true,
      },
      {
        id: '5',
        code: RoleCode.CUSTOMER || 'CUSTOMER',
        name: 'Khách hàng thành viên',
        description:
          'Tài khoản mặc định dành cho khách hàng đặt vé xem phim trực tuyến và tích lũy điểm thưởng.',
        isSystem: true,
      },
    ];

    console.log('Khởi chạy quy trình Seeding danh mục Vai trò (Roles)...');

    // 2. Thực thi ghi dữ liệu lũy đẳng (Chống crash lỗi khi chạy lại file seed nhiều lần)
    for (const roleData of systemRoles) {
      // Kiểm tra xem mã vai trò này đã tồn tại dưới DB chưa
      const existingRole = await roleRepository.findOne({
        where: { code: roleData.code },
      });

      if (!existingRole) {
        // Tạo mới nếu chưa tồn tại
        const newRole = roleRepository.create(roleData);
        await roleRepository.save(newRole);
        console.log(`Khởi tạo thành công vai trò: ${roleData.code}`);
      } else {
        // Tùy chọn doanh nghiệp: Cập nhật lại thông tin mô tả nếu có sự thay đổi trong cấu hình seed
        existingRole.name = roleData.name;
        existingRole.description = roleData.description;
        existingRole.isSystem = roleData.isSystem;
        await roleRepository.save(existingRole);
        console.log(`Cập nhật/Đồng bộ thành công vai trò: ${roleData.code}`);
      }
    }

    console.log('Hoàn thành Seeding danh mục Vai trò thành công!');
  }
}
