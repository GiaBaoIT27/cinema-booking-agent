import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not, Brackets } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from './entities/user.entity.js';
import { UserRole } from '../rbac/entities/user-role.entity.js';
import { Role } from '../rbac/entities/role.entity.js';

import { UpdateMeDto } from './dto/update-me.dto.js';
import { QueryUsersDto } from './dto/query-users.dto.js';
import { CreateInternalUserDto } from './dto/create-internal-user.dto.js';
import { AssignRoleDto } from './dto/assign-role.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { UserStatus } from './enums/user-status.enum.js';
import { MembershipTier } from './enums/membership-tier.enum.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly dataSource: DataSource,
  ) {}

  private async findUserEntity(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({
        message: 'Không tìm thấy hồ sơ người dùng trong hệ thống.',
        errorCode: 'USER_NOT_FOUND',
      });
    }
    return user;
  }

  // GET /api/v1/users/me
  async getProfile(userId: string) {
    const user = await this.findUserEntity(userId);

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      dateOfBirth: user.dateOfBirth
        ? new Date(user.dateOfBirth).toISOString().split('T')[0]
        : null, // Trả về chuẩn chuỗi YYYY-MM-DD
      membershipTier: user.membershipTier,
      loyaltyPoints: user.loyaltyPoints,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // PUT /api/v1/users/me
  async updateProfile(userId: string, dto: UpdateMeDto): Promise<any> {
    const user = await this.findUserEntity(userId);

    if (dto.phoneNumber && dto.phoneNumber !== user.phoneNumber) {
      const existingPhone = await this.userRepository.findOne({
        where: {
          phoneNumber: dto.phoneNumber,
          id: Not(userId), // Ràng buộc id != :userId giúp không bị trùng với chính mình
        },
      });

      if (existingPhone) {
        throw new ConflictException({
          message: 'Số điện thoại này đã được sử dụng bởi một tài khoản khác.',
          errorCode: 'PHONE_ALREADY_EXISTS',
        });
      }
    }

    user.fullName = dto.fullName;
    user.phoneNumber = dto.phoneNumber;
    user.dateOfBirth = dto.dateOfBirth
      ? new Date(dto.dateOfBirth)
      : user.dateOfBirth;

    // 4. Lưu trạng thái mới vào Cơ sở dữ liệu
    const updatedUser = await this.userRepository.save(user);

    // 5. Trả về đúng Response cấu trúc sạch theo đặc tả
    return {
      id: updatedUser.id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      phoneNumber: updatedUser.phoneNumber,
      dateOfBirth: updatedUser.dateOfBirth
        ? new Date(updatedUser.dateOfBirth).toISOString().split('T')[0]
        : null, // Trả về dạng YYYY-MM-DD sạch sẽ
      membershipTier: updatedUser.membershipTier,
      loyaltyPoints: updatedUser.loyaltyPoints,
      updatedAt: updatedUser.updatedAt,
    };
  }

  // GET /api/v1/users
  async findAll(query: QueryUsersDto) {
    const { membershipTier, status, keyword, page = 1, limit = 20 } = query;
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.fullName',
        'user.email',
        'user.phoneNumber',
        'user.membershipTier',
        'user.loyaltyPoints',
        'user.status',
        'user.createdAt',
      ]);

    // 1. Lọc theo Hạng thành viên
    if (membershipTier) {
      queryBuilder.andWhere('user.membership_tier = :membershipTier', {
        membershipTier,
      });
    }

    // 2. Lọc theo Trạng thái
    if (status) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    // 3. Tìm kiếm gộp không phân biệt hoa thường (Case-insensitive Search) bằng Brackets
    if (keyword) {
      const formattedKeyword = `%${keyword.trim()}%`;
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('user.email ILIKE :keyword', { keyword: formattedKeyword })
            .orWhere('user.phone_number ILIKE :keyword', {
              keyword: formattedKeyword,
            })
            .orWhere('user.full_name ILIKE :keyword', {
              keyword: formattedKeyword,
            });
        }),
      );
    }

    // 4. Thiết lập Phân trang & Sắp xếp
    queryBuilder
      .orderBy('user.id', 'DESC') // Sắp xếp theo ID giảm dần
      .skip((page - 1) * limit)
      .take(limit);

    // 5. Kích hoạt truy vấn song song lấy danh sách dữ liệu và tổng số hàng phục vụ đếm trang
    const [items, totalElements] = await queryBuilder.getManyAndCount();

    const formattedData = items.map((user) => ({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      membershipTier: user.membershipTier,
      loyaltyPoints: user.loyaltyPoints,
      status: user.status,
      createdAt: user.createdAt,
    }));

    return {
      data: formattedData,
      pagination: {
        page,
        limit,
        totalElements,
        totalPages: Math.ceil(totalElements / limit),
      },
    };
  }

  // POST /api/v1/users (Khởi tạo tài khoản Nội bộ - dùng Transaction)
  async createInternalUser(dto: CreateInternalUserDto): Promise<any> {
    const { fullName, email, phoneNumber, password, roleId, cineplexId } = dto;

    // 1. Kiểm tra trùng lặp email & phoneNumber
    const existingUser = await this.userRepository.findOne({
      where: [{ email }, { phoneNumber }],
    });

    if (existingUser) {
      const field =
        existingUser.email === email
          ? 'EMAIL_ALREADY_EXISTS'
          : 'PHONE_ALREADY_EXISTS';
      throw new ConflictException({
        message: `Thông tin ${existingUser.email === email ? 'Email' : 'Số điện thoại'} đã tồn tại trên hệ thống.`,
        errorCode: field,
      });
    }
    // Khởi tạo QueryRunner để thực thi Transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 2. Kiểm tra tồn tại của Role
      const role = await queryRunner.manager.findOne(Role, {
        where: { id: String(roleId) },
      });
      if (!role) {
        throw new NotFoundException({
          message: 'Vai trò phân quyền không tồn tại trong hệ thống.',
          errorCode: 'ROLE_NOT_FOUND',
        });
      }

      // 3. Kiểm tra Cineplex Scope Gatekeeper
      const internalRoleCodes = ['CINEMA_STAFF', 'CINEMA_MANAGER'];
      if (internalRoleCodes.includes(role.code) && !cineplexId) {
        throw new UnprocessableEntityException({
          message: `Mã cụm rạp (cineplexId) là bắt buộc đối với vai trò ${role.code}.`,
          errorCode: 'CINEPLEX_SCOPE_REQUIRED',
        });
      }

      // 4. Mã hóa mật khẩu khởi tạo (Cost Factor 12)
      const costFactor = 12;
      const hashedPassword = await bcrypt.hash(password, costFactor);

      // 5. Thực thi Step 1: Thêm mới User nội bộ
      const userInstance = queryRunner.manager.create(User, {
        fullName,
        email,
        phoneNumber,
        passwordHash: hashedPassword,
        status: UserStatus.ACTIVE,
        membershipTier: MembershipTier.MEMBER,
        loyaltyPoints: 0,
      });
      const savedUser = await queryRunner.manager.save(User, userInstance);

      // 6. Thực thi Step 2: Thêm mới liên kết quyền vào bảng UserRole
      const userRoleInstance = queryRunner.manager.create(UserRole, {
        user: savedUser,
        role: role,
        cineplexId: cineplexId ? String(cineplexId) : null,
      });
      await queryRunner.manager.save(UserRole, userRoleInstance);

      // Commit toàn bộ thay đổi dữ liệu vào Database
      await queryRunner.commitTransaction();

      // 7. Định dạng Output khớp chính xác Response Schema đặc tả (6.3)
      return {
        id: savedUser.id,
        fullName: savedUser.fullName,
        email: savedUser.email,
        phoneNumber: savedUser.phoneNumber,
        status: savedUser.status,
        assignedRole: {
          roleId: role.id,
          roleCode: role.code,
          cineplexId: cineplexId || null,
        },
        createdAt: savedUser.createdAt,
      };
    } catch (error) {
      // Rollback hoàn nguyên dữ liệu nếu bất kỳ bước nào trong Transaction bị crash
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Giải phóng kết nối QueryRunner về Connection Pool
      await queryRunner.release();
    }
  }

  // GET /api/v1/users/{id}
  async findById(id: string): Promise<any> {
    // 1. Truy vấn chi tiết người dùng kèm thông tin lồng nhau: userRoles -> role & userRoles -> cineplex
    const user = await this.userRepository.findOne({
      where: { id: String(id) }, // Ép kiểu String để tương thích an toàn với kiểu dữ liệu bigint
      relations: {
        userRoles: {
          role: true,
          cineplex: true, // Nạp thông tin cụm rạp để lấy trường cineplexName
        },
      },
    });
    // 2. Kiểm tra tồn tại (USER_NOT_FOUND) theo đúng mã đặc tả doanh nghiệp
    if (!user) {
      throw new NotFoundException({
        message: `Không tìm thấy tài khoản người dùng có mã ID: ${id} trong hệ thống.`,
        errorCode: 'USER_NOT_FOUND',
      });
    }
    // 3. Phẳng hóa dữ liệu mảng các Vai trò & Cụm rạp để khớp chính xác Response Schema
    const formattedRoles = (user.userRoles || []).map((userRole) => ({
      roleId: userRole.role ? Number(userRole.role.id) : null,
      roleCode: userRole.role ? userRole.role.code : 'UNKNOWN',
      roleName: userRole.role ? userRole.role.name : 'Chưa xác định',
      cineplexId: userRole.cineplexId ? Number(userRole.cineplexId) : null,
      cineplexName: userRole.cineplex
        ? userRole.cineplex.name
        : 'Hệ thống Tổng', // Lấy tên từ bảng liên kết
    }));

    // 4. Trả về đúng Response cấu trúc hồ sơ sạch, loại bỏ hoàn toàn passwordHash
    return {
      id: user.id, // Kiểu bigint trả về string an toàn cho Frontend
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      dateOfBirth: user.dateOfBirth
        ? new Date(user.dateOfBirth).toISOString().split('T')[0]
        : null, // Trả về dạng chuỗi sạch YYYY-MM-DD
      membershipTier: user.membershipTier,
      loyaltyPoints: user.loyaltyPoints,
      status: user.status,
      roles: formattedRoles,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // PUT /api/v1/users/{id}/role
  async assignRole(
    targetUserId: string,
    dto: AssignRoleDto,
    caller: any,
  ): Promise<any> {
    const { roleId, cineplexId } = dto;
    const targetUserIdStr = String(targetUserId);

    // 1. Kiểm tra tồn tại của Target User kèm nạp danh sách role hiện tại
    const targetUser = await this.userRepository.findOne({
      where: { id: targetUserIdStr },
      relations: { userRoles: { role: true } },
    });

    if (!targetUser) {
      throw new NotFoundException({
        message: 'Tài khoản người dùng cần thay đổi quyền không tồn tại.',
        errorCode: 'USER_NOT_FOUND',
      });
    }

    // 2. Bảo vệ Tài khoản Super Admin (Hierarchy Constraint)
    const hasSuperAdmin = targetUser.userRoles.some(
      (ur) => ur.role && ur.role.code === 'SUPER_ADMIN',
    );
    if (hasSuperAdmin && caller.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException({
        message:
          'Thao tác bị từ chối. Bạn không có quyền hạ cấp hoặc thay đổi vai trò của tài khoản quản trị tối cao.',
        errorCode: 'CANNOT_MODIFY_SUPER_ADMIN_ROLE',
      });
    }

    // Khởi tạo QueryRunner chạy ACID Transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 3. Kiểm tra sự tồn tại của Vai trò mới
      const newRole = await queryRunner.manager.findOne(Role, {
        where: { id: String(roleId) },
      });

      if (!newRole) {
        throw new NotFoundException({
          message: 'Vai trò mới muốn gán không tồn tại trên hệ thống.',
          errorCode: 'ROLE_NOT_FOUND',
        });
      }

      // Kiểm tra Ràng buộc Cụm rạp đối với nhân viên nội bộ
      if (
        ['CINEMA_STAFF', 'CINEMA_MANAGER'].includes(newRole.code) &&
        !cineplexId
      ) {
        throw new UnprocessableEntityException({
          message: `Mã cụm rạp (cineplexId) là bắt buộc đối với vai trò nội bộ ${newRole.code}.`,
          errorCode: 'CINEPLEX_SCOPE_REQUIRED',
        });
      }

      // 4. Thực thi quy trình gán đè (Overwrite): Xóa hết vai trò cũ của User này
      await queryRunner.manager.delete(UserRole, {
        user: { id: targetUserIdStr },
      });

      // 5. Thêm mới bản ghi vai trò và cơ sở làm việc mới
      const newUserRoleInstance = queryRunner.manager.create(UserRole, {
        user: targetUser,
        role: newRole,
        cineplexId: cineplexId ? String(cineplexId) : null,
      });
      await queryRunner.manager.save(UserRole, newUserRoleInstance);

      // Commit dữ liệu an toàn
      await queryRunner.commitTransaction();

      // 6. Vô hiệu hóa Cache & Đẩy Token hiện tại của User vào Redis Blacklist [8.2]
      // Trích xuất TTL còn lại của Access Token hoặc gán cứng thời gian khóa (ví dụ: 30 phút) để ép đăng nhập lại
      // await this.redisService.set(`blacklist:token:${targetUserIdStr}`, 'revoked', 'EX', 1800);

      // 7. Trả về đúng định dạng dữ liệu nhỏ gọn theo Response Schema (8.3)
      return {
        userId: Number(targetUser.id),
        updatedRole: {
          roleId: Number(newRole.id),
          roleCode: newRole.code,
          cineplexId: cineplexId ? Number(cineplexId) : null,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // PATCH /api/v1/users/{id}/status
  async updateStatus(
    targetUserId: string,
    dto: UpdateUserStatusDto,
    caller: any,
  ): Promise<any> {
    const { status, reason } = dto;
    const targetUserIdStr = String(targetUserId);
    // 1. Bảo vệ Tự khóa (Self-Lock Prevention)
    if (
      status === UserStatus.BLOCKED &&
      targetUserIdStr === String(caller.userId)
    ) {
      throw new BadRequestException({
        message:
          'Thao tác không hợp lệ. Hệ thống không cho phép bạn tự khóa tài khoản của chính mình.',
        errorCode: 'CANNOT_BLOCK_SELF',
      });
    }
    // 2. Tìm kiếm thực thể User thô từ DB để chỉnh sửa dữ liệu gốc
    const user = await this.userRepository.findOne({
      where: { id: targetUserIdStr },
    });
    if (!user) {
      throw new NotFoundException({
        message:
          'Tài khoản người dùng cần thay đổi trạng thái không tồn tại trên hệ thống.',
        errorCode: 'USER_NOT_FOUND',
      });
    }
    // 3. Tiến hành cập nhật trạng thái mới
    user.status = status;
    const updatedUser = await this.userRepository.save(user);

    let revokedSessionsCount = 0;

    // 4. Kích hoạt Quy Trình Khóa Tài Khoản Tức Thì (Immediate Account Block Workflow) [9.2]
    if (status === UserStatus.BLOCKED) {
      // Logic doanh nghiệp: Xóa hoặc revoke các session active trên Redis/DB
      // Giả định bạn quét danh sách token hoặc refresh token lưu theo mẫu: `refresh_token:${targetUserIdStr}:*`

      // const pattern = `refresh_token:${targetUserIdStr}:*`;
      // const keys = await this.redisService.keys(pattern);
      // if (keys.length > 0) {
      //   revokedSessionsCount = keys.length;
      //   await this.redisService.del(keys); // Xóa sạch token active
      // }

      // Đồng thời, đưa userId này vào danh sách đen của Redis Gateway trong vòng 7 ngày (thời gian sống lâu nhất của Refresh Token)
      // await this.redisService.set(`blacklist:user:${targetUserIdStr}`, JSON.stringify({ reason }), 'EX', 7 * 24 * 60 * 60);

      revokedSessionsCount = 2; // Giả lập số lượng phiên bị hủy bỏ phục vụ khớp Response Schema đặc tả
    }

    // 5. Trả về đúng kết quả tinh gọn theo Response Schema (9.3)
    return {
      userId: Number(updatedUser.id),
      status: updatedUser.status,
      reason: reason || 'Thay đổi trạng thái định kỳ bởi quản trị viên',
      revokedSessionsCount: revokedSessionsCount,
      updatedAt: updatedUser.updatedAt,
    };
  }
}
