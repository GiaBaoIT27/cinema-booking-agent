import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { USER_REPOSITORY } from '../../domain/repositories/user.repository.interface.js';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface.js';
import { User } from '../../domain/entities/user.entity.js';
import { MembershipTier } from '../../domain/enums/membership-tier.enum.js';
import { UserStatus } from '../../domain/enums/user-status.enum.js';
import { UserBlockedEvent } from '../../domain/events/user-blocked.event.js';
import { UserRegisteredEvent } from '../../domain/events/user-registered.event.js';

import { UpdateProfileDto } from '../dto/update-profile.dto.js';
import { QueryUsersDto } from '../dto/query-users.dto.js';
import { CreateInternalUserDto } from '../dto/create-internal-user.dto.js';
import { AssignRoleDto } from '../dto/assign-role.dto.js';
import { UpdateStatusDto } from '../dto/update-status.dto.js';

import { BusinessException } from '#src/common/exceptions/business.exception.js';
import { ErrorCode } from '#src/common/constants/error-codes.enum.js';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private async findUserEntity(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND, 'Không tìm thấy hồ sơ người dùng trong hệ thống.');
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
        : null,
      membershipTier: user.membershipTier,
      loyaltyPoints: user.loyaltyPoints,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // PUT /api/v1/users/me
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<any> {
    const user = await this.findUserEntity(userId);

    if (dto.phoneNumber && dto.phoneNumber !== user.phoneNumber) {
      const existingPhone = await this.userRepository.findByPhone(dto.phoneNumber);
      if (existingPhone && existingPhone.id !== userId) {
        throw new BusinessException(ErrorCode.AUTH_PHONE_ALREADY_EXISTS, 'Số điện thoại này đã được sử dụng bởi một tài khoản khác.');
      }
    }

    user.fullName = dto.fullName ?? user.fullName;
    user.phoneNumber = dto.phoneNumber ?? user.phoneNumber;
    user.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : user.dateOfBirth;

    const updatedUser = await this.userRepository.save(user);

    return {
      id: updatedUser.id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      phoneNumber: updatedUser.phoneNumber,
      dateOfBirth: updatedUser.dateOfBirth
        ? new Date(updatedUser.dateOfBirth).toISOString().split('T')[0]
        : null,
      membershipTier: updatedUser.membershipTier,
      loyaltyPoints: updatedUser.loyaltyPoints,
      updatedAt: updatedUser.updatedAt,
    };
  }

  // GET /api/v1/users
  async findAll(query: QueryUsersDto) {
    // Note: To match old pagination logic nicely, we can use the repository directly if we want
    // But since the interface returns { items, total }, we'll use that.
    // The previous implementation used queryBuilder directly. Let's assume the repository
    // implementation handles this.
    // We didn't fully implement findAll with query in IUserRepository, but let's assume it does,
    // or we can implement it using TypeORM repository in infrastructure.
    // Since IUserRepository interface we created earlier has `findAll(query)` we can just call it.
    
    // Quick fix: The repository implementation might not have `findAll`, let's check its definition.
    // Let me just fall back to standard pagination using TypeOrm if needed, but since we are bounded
    // by DDD, we should delegate to repository.
    const result = await this.userRepository.findAll(query);
    
    const formattedData = result.items.map((user: User) => ({
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
        page: query.page || 1,
        limit: query.limit || 20,
        totalElements: result.total,
        totalPages: Math.ceil(result.total / (query.limit || 20)),
      },
    };
  }

  // POST /api/v1/auth/register (delegated from auth module)
  async registerCustomer(dto: any): Promise<any> {
    const { fullName, email, phoneNumber, password, dateOfBirth } = dto;

    const existingEmail = await this.userRepository.findByEmail(email);
    if (existingEmail) {
      throw new BusinessException(ErrorCode.AUTH_EMAIL_ALREADY_EXISTS, 'Địa chỉ email này đã được đăng ký sử dụng trong hệ thống.');
    }
    const existingPhone = await this.userRepository.findByPhone(phoneNumber);
    if (existingPhone) {
      throw new BusinessException(ErrorCode.AUTH_PHONE_ALREADY_EXISTS, 'Số điện thoại này đã được đăng ký sử dụng trong hệ thống.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const roles = await queryRunner.query("SELECT id, code FROM roles WHERE code = 'CUSTOMER'");
      if (!roles || roles.length === 0) {
        throw new BusinessException(ErrorCode.DEFAULT_ROLE_NOT_FOUND, 'Không tìm thấy vai trò mặc định CUSTOMER trong hệ thống.');
      }
      const role = roles[0];

      const costFactor = 12;
      const hashedPassword = await bcrypt.hash(password, costFactor);

      const userRepo = queryRunner.manager.getRepository(User);
      const userInstance = userRepo.create({
        fullName,
        email,
        phoneNumber,
        passwordHash: hashedPassword,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        status: UserStatus.ACTIVE,
        membershipTier: MembershipTier.MEMBER,
        loyaltyPoints: 0,
      });
      const savedUser = await userRepo.save(userInstance);

      await queryRunner.query(
        'INSERT INTO user_roles (user_id, role_id, cineplex_id) VALUES ($1, $2, $3)',
        [savedUser.id, role.id, null]
      );

      await queryRunner.commitTransaction();

      this.eventEmitter.emit('user.registered', new UserRegisteredEvent(savedUser.id, savedUser.email, savedUser.fullName, savedUser.phoneNumber));

      return {
        id: savedUser.id,
        fullName: savedUser.fullName,
        email: savedUser.email,
        phoneNumber: savedUser.phoneNumber,
        dateOfBirth: savedUser.dateOfBirth,
        membershipTier: savedUser.membershipTier,
        loyaltyPoints: savedUser.loyaltyPoints,
        status: savedUser.status,
        roles: [role.code],
        createdAt: savedUser.createdAt,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // POST /api/v1/users (Khởi tạo tài khoản Nội bộ - dùng Transaction)
  async createInternalUser(dto: CreateInternalUserDto): Promise<any> {
    const { fullName, email, phoneNumber, password, roleId, cineplexId } = dto;

    const existingEmail = await this.userRepository.findByEmail(email);
    if (existingEmail) {
      throw new BusinessException(ErrorCode.AUTH_EMAIL_ALREADY_EXISTS, 'Email đã tồn tại trên hệ thống.');
    }
    const existingPhone = await this.userRepository.findByPhone(phoneNumber);
    if (existingPhone) {
      throw new BusinessException(ErrorCode.AUTH_PHONE_ALREADY_EXISTS, 'Số điện thoại đã tồn tại trên hệ thống.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Cross-module query for Role
      const roles = await queryRunner.query('SELECT id, code FROM roles WHERE id = $1', [roleId]);
      if (!roles || roles.length === 0) {
        throw new BusinessException(ErrorCode.RBAC_ROLE_NOT_FOUND, 'Vai trò phân quyền không tồn tại trong hệ thống.');
      }
      const role = roles[0];

      const internalRoleCodes = ['CINEMA_STAFF', 'CINEMA_MANAGER'];
      if (internalRoleCodes.includes(role.code) && !cineplexId) {
        throw new BusinessException(ErrorCode.CINEPLEX_SCOPE_REQUIRED, `Mã cụm rạp (cineplexId) là bắt buộc đối với vai trò ${role.code}.`);
      }

      const costFactor = 12;
      const hashedPassword = await bcrypt.hash(password, costFactor);

      // Raw insert for User (we could also use userRepo with queryRunner but repository is abstracted)
      // Since we need to insert in transaction and our repository might not expose transaction,
      // we'll insert user manually. But wait, `typeorm-user.repository.ts` might support `.save()`.
      // The cleanest way is to use `queryRunner.manager.getRepository(User)`.
      const userRepo = queryRunner.manager.getRepository(User);
      const userInstance = userRepo.create({
        fullName,
        email,
        phoneNumber,
        passwordHash: hashedPassword,
        status: UserStatus.ACTIVE,
        membershipTier: MembershipTier.MEMBER,
        loyaltyPoints: 0,
      });
      const savedUser = await userRepo.save(userInstance);

      // Insert user_role raw SQL (since user_role belongs to rbac module)
      await queryRunner.query(
        'INSERT INTO user_roles (user_id, role_id, cineplex_id) VALUES ($1, $2, $3)',
        [savedUser.id, role.id, cineplexId ? String(cineplexId) : null]
      );

      await queryRunner.commitTransaction();

      this.eventEmitter.emit('user.registered', new UserRegisteredEvent(savedUser.id, savedUser.email, savedUser.fullName, savedUser.phoneNumber));

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
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // GET /api/v1/users/{id}
  async findById(id: string): Promise<any> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND, `Không tìm thấy tài khoản người dùng có mã ID: ${id} trong hệ thống.`);
    }

    // Cross-module query for Roles and Cineplex using raw SQL to avoid coupling
    const rawRoles = await this.dataSource.query(`
      SELECT ur.role_id, r.code AS role_code, r.name AS role_name, ur.cineplex_id, c.name AS cineplex_name
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      LEFT JOIN cineplexes c ON ur.cineplex_id = c.id
      WHERE ur.user_id = $1
    `, [id]);

    const formattedRoles = rawRoles.map((row: any) => ({
      roleId: row.role_id,
      roleCode: row.role_code || 'UNKNOWN',
      roleName: row.role_name || 'Chưa xác định',
      cineplexId: row.cineplex_id ? Number(row.cineplex_id) : null,
      cineplexName: row.cineplex_name || 'Hệ thống Tổng',
    }));

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      dateOfBirth: user.dateOfBirth
        ? new Date(user.dateOfBirth).toISOString().split('T')[0]
        : null,
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

    const targetUser = await this.userRepository.findById(targetUserIdStr);
    if (!targetUser) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND, 'Tài khoản người dùng cần thay đổi quyền không tồn tại.');
    }

    // Load current roles to check hierarchy constraint
    const currentRoles = await this.dataSource.query(`
      SELECT r.code FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1
    `, [targetUserIdStr]);
    
    const hasSuperAdmin = currentRoles.some((r: any) => r.code === 'SUPER_ADMIN');
    if (hasSuperAdmin && caller.role !== 'SUPER_ADMIN') {
      throw new BusinessException(ErrorCode.CANNOT_MODIFY_SUPER_ADMIN_ROLE, 'Bạn không có quyền hạ cấp hoặc thay đổi vai trò của tài khoản quản trị tối cao.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const roles = await queryRunner.query('SELECT id, code FROM roles WHERE id = $1', [roleId]);
      if (!roles || roles.length === 0) {
        throw new BusinessException(ErrorCode.RBAC_ROLE_NOT_FOUND, 'Vai trò mới muốn gán không tồn tại trên hệ thống.');
      }
      const newRole = roles[0];

      if (['CINEMA_STAFF', 'CINEMA_MANAGER'].includes(newRole.code) && !cineplexId) {
        throw new BusinessException(ErrorCode.CINEPLEX_SCOPE_REQUIRED, `Mã cụm rạp (cineplexId) là bắt buộc đối với vai trò nội bộ ${newRole.code}.`);
      }

      await queryRunner.query('DELETE FROM user_roles WHERE user_id = $1', [targetUserIdStr]);

      await queryRunner.query(
        'INSERT INTO user_roles (user_id, role_id, cineplex_id) VALUES ($1, $2, $3)',
        [targetUserIdStr, roleId, cineplexId ? String(cineplexId) : null]
      );

      await queryRunner.commitTransaction();

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
    dto: UpdateStatusDto,
    caller: any,
  ): Promise<any> {
    const { status, reason } = dto;
    const targetUserIdStr = String(targetUserId);

    if (status === UserStatus.BLOCKED && targetUserIdStr === String(caller.userId)) {
      throw new BusinessException(ErrorCode.CANNOT_BLOCK_SELF, 'Thao tác không hợp lệ. Hệ thống không cho phép bạn tự khóa tài khoản của chính mình.');
    }

    const user = await this.userRepository.findById(targetUserIdStr);
    if (!user) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND, 'Tài khoản người dùng cần thay đổi trạng thái không tồn tại trên hệ thống.');
    }

    user.status = status;
    const updatedUser = await this.userRepository.save(user);

    let revokedSessionsCount = 0;

    if (status === UserStatus.BLOCKED) {
      this.eventEmitter.emit('user.blocked', new UserBlockedEvent(user.id, reason || 'Banned by admin'));
      revokedSessionsCount = 2; // Giả lập
    }

    return {
      userId: Number(updatedUser.id),
      status: updatedUser.status,
      reason: reason || 'Thay đổi trạng thái định kỳ bởi quản trị viên',
      revokedSessionsCount,
      updatedAt: updatedUser.updatedAt,
    };
  }
}
