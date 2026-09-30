import {
  ConflictException,
  Injectable,
  Inject,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { UserRole } from '../../domain/entities/user-role.entity.js';
import { AssignUserRoleDto } from '../dto/assign-user-role.dto.js';
import { SyncUserRolesDto } from '../dto/sync-user-roles.dto.js';
import { USER_ROLE_REPOSITORY } from '../../domain/repositories/user-role.repository.interface.js';
import type { IUserRoleRepository } from '../../domain/repositories/user-role.repository.interface.js';
import { ROLE_REPOSITORY } from '../../domain/repositories/role.repository.interface.js';
import type { IRoleRepository } from '../../domain/repositories/role.repository.interface.js';
import { PermissionCacheService } from './permission-cache.service.js';
import { ErrorCode } from '#src/common/constants/error-codes.enum.js';
import { BusinessException } from '#src/common/exceptions/business.exception.js';

@Injectable()
export class UserRolesService {
  constructor(
    @Inject(USER_ROLE_REPOSITORY)
    private readonly userRoleRepository: IUserRoleRepository,
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: IRoleRepository,
    private readonly permissionCacheService: PermissionCacheService,
    private readonly dataSource: DataSource,
  ) {}

  // GET /api/v1/users/:userId/roles
  async getUserRoles(userId: number): Promise<any> {
    const userIdStr = String(userId);

    // Kiểm tra user tồn tại bằng query DB (không phụ thuộc User entity của module khác)
    const userRows = await this.dataSource.query(
      'SELECT id, full_name as "fullName" FROM users WHERE id = $1 LIMIT 1',
      [userIdStr],
    );

    if (!userRows || userRows.length === 0) {
      throw new BusinessException(
        ErrorCode.USER_NOT_FOUND,
        `Tài khoản người dùng với mã ID ${userId} không tồn tại trên hệ thống.`,
        404,
      );
    }

    const user = userRows[0];

    // Truy vấn danh sách phân quyền (đã eager load role nội bộ)
    const userRoles = await this.userRoleRepository.findByUserId(userIdStr);

    // Lấy thông tin cineplexName nếu có gán cineplexId
    const cineplexIds = userRoles
      .map((ur) => ur.cineplexId)
      .filter((cid): cid is string => Boolean(cid));

    const cineplexNameMap = new Map<string, string>();
    if (cineplexIds.length > 0) {
      const cineplexRows = await this.dataSource.query(
        'SELECT id, name FROM cineplexes WHERE id = ANY($1)',
        [cineplexIds],
      );
      for (const row of cineplexRows) {
        cineplexNameMap.set(String(row.id), row.name);
      }
    }

    const assignedRoles = userRoles.map((ur) => {
      const isGlobal = !ur.cineplexId;

      return {
        assignmentId: Number(ur.id),
        roleId: ur.role ? Number(ur.role.id) : null,
        roleCode: ur.role ? ur.role.code : 'UNKNOWN',
        roleName: ur.role ? ur.role.name : 'Chưa xác định',
        scope: isGlobal
          ? { type: 'GLOBAL' }
          : {
              type: 'CINEPLEX_RESTRICTED',
              cineplexId: Number(ur.cineplexId),
              cineplexName: ur.cineplexId
                ? cineplexNameMap.get(String(ur.cineplexId)) || 'Rạp chưa xác định'
                : 'Rạp chưa xác định',
            },
        assignedAt: ur.createdAt,
      };
    });

    return {
      userId: Number(user.id),
      userFullName: user.fullName,
      assignedRoles,
    };
  }

  // POST /api/v1/users/:userId/roles
  async assignRole(userId: number, dto: AssignUserRoleDto): Promise<any> {
    const { roleId, cineplexId } = dto;
    const userIdStr = String(userId);
    const roleIdStr = String(roleId);
    const cineplexIdStr = cineplexId ? String(cineplexId) : null;

    // 1. Kiểm tra User tồn tại
    const userRows = await this.dataSource.query(
      'SELECT id FROM users WHERE id = $1 LIMIT 1',
      [userIdStr],
    );
    if (!userRows || userRows.length === 0) {
      throw new BusinessException(
        ErrorCode.USER_NOT_FOUND,
        'Tài khoản người dùng không tồn tại.',
        404,
      );
    }

    // 2. Kiểm tra Role tồn tại
    const role = await this.roleRepository.findById(roleIdStr);
    if (!role) {
      throw new BusinessException(
        ErrorCode.RBAC_ROLE_NOT_FOUND,
        'Vai trò phân quyền không tồn tại.',
        404,
      );
    }

    // 3. Kiểm tra Cineplex tồn tại nếu có truyền
    if (cineplexIdStr) {
      const cineplexRows = await this.dataSource.query(
        'SELECT id FROM cineplexes WHERE id = $1 LIMIT 1',
        [cineplexIdStr],
      );
      if (!cineplexRows || cineplexRows.length === 0) {
        throw new BusinessException(
          ErrorCode.CINEMA_CINEPLEX_NOT_FOUND,
          'Cụm rạp chiếu phim không tồn tại.',
          404,
        );
      }
    }

    // 4. Kiểm tra trùng lặp
    const isDuplicate = await this.userRoleRepository.existsDuplicate(
      userIdStr,
      roleIdStr,
      cineplexIdStr,
    );

    if (isDuplicate) {
      throw new ConflictException({
        message: 'This role with the specified cineplex scope is already assigned to the user',
        errorCode: 'USER_ROLE_SCOPE_ALREADY_EXISTS',
      });
    }

    // 5. Thêm mới bản ghi
    const userRoleInstance = this.userRoleRepository.create({
      userId: userIdStr,
      roleId: roleIdStr,
      cineplexId: cineplexIdStr,
    });

    const savedRecord = await this.userRoleRepository.save(userRoleInstance);

    // Invalidate Cache quyền hạn của user
    await this.permissionCacheService.invalidateUser(userIdStr);

    return {
      id: Number(savedRecord.id),
      userId: Number(savedRecord.userId),
      roleId: Number(savedRecord.roleId),
      roleCode: role.code,
      cineplexId: savedRecord.cineplexId ? Number(savedRecord.cineplexId) : null,
      scopeType: savedRecord.cineplexId ? 'CINEPLEX_RESTRICTED' : 'GLOBAL',
      createdAt: savedRecord.createdAt,
    };
  }

  // POST /api/v1/users/:userId/roles/sync
  async syncRoles(userId: number, dto: SyncUserRolesDto): Promise<any> {
    const { roles = [] } = dto;
    const userIdStr = String(userId);

    // 1. Kiểm tra User tồn tại
    const userRows = await this.dataSource.query(
      'SELECT id FROM users WHERE id = $1 LIMIT 1',
      [userIdStr],
    );
    if (!userRows || userRows.length === 0) {
      throw new BusinessException(
        ErrorCode.USER_NOT_FOUND,
        'Tài khoản người dùng tra cứu không tồn tại.',
        404,
      );
    }

    // 2. Validate danh sách roles & cineplexes
    if (roles.length > 0) {
      const uniqueRoleIds = [...new Set(roles.map((r) => String(r.roleId)))];
      const uniqueCineplexIds = [
        ...new Set(
          roles.filter((r) => r.cineplexId).map((r) => String(r.cineplexId)),
        ),
      ];

      const dbRolesCount = await this.roleRepository.countByIds(uniqueRoleIds);

      let dbCineplexesCount = 0;
      if (uniqueCineplexIds.length > 0) {
        const rows = await this.dataSource.query(
          'SELECT COUNT(id) as count FROM cineplexes WHERE id = ANY($1)',
          [uniqueCineplexIds],
        );
        dbCineplexesCount = Number(rows[0]?.count || 0);
      }

      if (
        dbRolesCount !== uniqueRoleIds.length ||
        dbCineplexesCount !== uniqueCineplexIds.length
      ) {
        throw new BusinessException(
          ErrorCode.RESOURCE_NOT_FOUND,
          'Danh sách đồng bộ chứa vai trò hoặc cụm rạp không hợp lệ.',
          404,
        );
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.delete(UserRole, { userId: userIdStr });

      let insertedRecords: UserRole[] = [];

      if (roles.length > 0) {
        const userRoleInstances = roles.map((r) =>
          queryRunner.manager.create(UserRole, {
            userId: userIdStr,
            roleId: String(r.roleId),
            cineplexId: r.cineplexId ? String(r.cineplexId) : null,
          }),
        );
        insertedRecords = await queryRunner.manager.save(UserRole, userRoleInstances);
      }

      await queryRunner.commitTransaction();

      // Invalidate Cache quyền hạn của user
      await this.permissionCacheService.invalidateUser(userIdStr);

      const roleMapping = await this.roleRepository.findByIds(
        roles.map((r) => String(r.roleId)),
      );
      const roleCodeMap = new Map(roleMapping.map((r) => [r.id, r.code]));

      const assignedRoles = insertedRecords.map((rec) => ({
        assignmentId: Number(rec.id),
        roleId: Number(rec.roleId),
        roleCode: roleCodeMap.get(rec.roleId) || 'UNKNOWN',
        cineplexId: rec.cineplexId ? Number(rec.cineplexId) : null,
      }));

      return {
        userId: Number(userIdStr),
        totalRolesAssigned: assignedRoles.length,
        assignedRoles,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // DELETE /api/v1/users/:userId/roles/:id
  async revokeRoleAssignment(id: number): Promise<any> {
    const assignmentIdStr = String(id);

    const userRole = await this.userRoleRepository.findById(assignmentIdStr);

    if (!userRole) {
      throw new BusinessException(
        ErrorCode.RESOURCE_NOT_FOUND,
        'Bản ghi gán vai trò và phạm vi cụm rạp không tồn tại hoặc đã bị thu hồi trước đó.',
        404,
      );
    }

    await this.userRoleRepository.deleteById(assignmentIdStr);

    // Invalidate Cache quyền hạn của user
    await this.permissionCacheService.invalidateUser(userRole.userId);

    return {
      deletedAssignmentId: Number(userRole.id),
      affectedUserId: Number(userRole.userId),
    };
  }
}
