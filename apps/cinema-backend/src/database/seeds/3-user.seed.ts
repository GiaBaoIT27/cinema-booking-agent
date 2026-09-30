import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt'; // Hoặc import bcryptjs from 'bcryptjs';
import { User } from '#modules/users/entities/user.entity.js';
import { Role } from '#modules/rbac/domain/entities/role.entity.js';
import { UserRole } from '#modules/rbac/domain/entities/user-role.entity.js';
import { UserStatus } from '#modules/users/domain/enums/user-status.enum.js';
import { MembershipTier } from '#modules/users/domain/enums/membership-tier.enum.js';
import { RoleCode } from '#modules/rbac/domain/enums/role.enum.js';

export class UserSeeder {
  async run(dataSource: DataSource): Promise<void> {
    const userRepository = dataSource.getRepository(User);
    const roleRepository = dataSource.getRepository(Role);
    const userRoleRepository = dataSource.getRepository(UserRole);

    console.log(
      'Khởi chạy quy trình Seeding tài khoản Quản trị viên (Admin User)...',
    );

    // 1. Chuẩn bị mật khẩu băm sẵn cho Admin
    const defaultPassword = 'Admin123@Password'; // Mật khẩu dùng để đăng nhập
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

    // 2. Định nghĩa danh sách các tài khoản cốt lõi
    const adminUsersData = [
      {
        fullName: 'System Super Admin',
        email: 'admin@cinema.com',
        phoneNumber: '0901234567',
        passwordHash: passwordHash,
        dateOfBirth: new Date('1990-01-01'),
        membershipTier: MembershipTier.VVIP || 'VVIP',
        loyaltyPoints: 9999,
        status: UserStatus.ACTIVE || 'ACTIVE',
        targetRoleCode: RoleCode.SUPER_ADMIN || 'SUPER_ADMIN',
      },
      {
        fullName: 'Quản Lý Cụm Rạp Mẫu',
        email: 'manager@cinema.com',
        phoneNumber: '0908765432',
        passwordHash: passwordHash,
        dateOfBirth: new Date('1995-05-15'),
        membershipTier: MembershipTier.VIP || 'VIP',
        loyaltyPoints: 1000,
        status: UserStatus.ACTIVE || 'ACTIVE',
        targetRoleCode: RoleCode.CINEMA_MANAGER || 'CINEMA_MANAGER',
      },
    ];

    // 3. Thực thi Seeding lũy đẳng (Idempotent)
    for (const userData of adminUsersData) {
      const { targetRoleCode, ...userFields } = userData;

      // Kiểm tra xem User đã tồn tại theo Email chưa
      let existingUser = await userRepository.findOne({
        where: { email: userFields.email },
      });

      if (!existingUser) {
        // Tạo User mới
        const newUser = userRepository.create(userFields);
        existingUser = await userRepository.save(newUser);
        console.log(`Khởi tạo thành công User: ${existingUser.email}`);
      } else {
        // Cập nhật lại mật khẩu/thông tin nếu cần
        existingUser.fullName = userFields.fullName;
        existingUser.phoneNumber = userFields.phoneNumber;
        existingUser.passwordHash = userFields.passwordHash;
        existingUser.status = userFields.status;
        await userRepository.save(existingUser);
        console.log(`Đồng bộ thành công User: ${existingUser.email}`);
      }

      // 4. Gán Role tương ứng cho User (Ghi vào bảng user_roles)
      const role = await roleRepository.findOne({
        where: { code: targetRoleCode },
      });

      if (role) {
        const existingUserRole = await userRoleRepository.findOne({
          where: {
            user: { id: existingUser.id },
            role: { id: role.id },
          },
        });

        if (!existingUserRole) {
          const newUserRole = userRoleRepository.create({
            user: existingUser,
            role: role,
            cineplexId: null, // Super Admin không bị giới hạn bởi Cineplex cụ thể
          });
          await userRoleRepository.save(newUserRole);
          console.log(
            `Gán vai trò ${role.code} cho ${existingUser.email} thành công.`,
          );
        }
      } else {
        console.warn(
          `[Cảnh báo] Không tìm thấy Role với code: ${targetRoleCode}`,
        );
      }
    }

    console.log('Hoàn thành Seeding tài khoản User & Phân quyền thành công!');
  }
}
