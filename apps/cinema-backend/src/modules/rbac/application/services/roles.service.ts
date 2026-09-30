import {
  ConflictException,
  Injectable,
  UnprocessableEntityException,
  Inject,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Role } from '../../domain/entities/role.entity.js';
import { QueryRolesDto } from '../dto/query-roles.dto.js';
import { CreateRoleDto } from '../dto/create-role.dto.js';
import { Permission } from '../../domain/entities/permission.entity.js';
import { RolePermission } from '../../domain/entities/role-permission.entity.js';
import { UpdateRoleDto } from '../dto/update-role.dto.js';
import { ROLE_REPOSITORY } from '../../domain/repositories/role.repository.interface.js';
import type { IRoleRepository } from '../../domain/repositories/role.repository.interface.js';
import { RolePermissionsChangedEvent } from '../../domain/events/role-permissions-changed.event.js';
import { ErrorCode } from '#src/common/constants/error-codes.enum.js';
import { BusinessException } from '#src/common/exceptions/business.exception.js';

@Injectable()
export class RolesService {
  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: IRoleRepository,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // GET /api/v1/roles
  async findAll(query: QueryRolesDto): Promise<any> {
    const { keyword, page = 1, limit = 20 } = query;

    const { items, total } = await this.roleRepository.findAll({
      keyword,
      page,
      limit,
    });

    const formattedData = items.map((role) => ({
      id: Number(role.id),
      code: role.code,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));

    return {
      data: formattedData,
      pagination: {
        page,
        limit,
        totalElements: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // GET /api/v1/roles/:id
  async findById(id: number): Promise<any> {
    const role = await this.roleRepository.findByIdWithPermissions(String(id));

    if (!role) {
      throw new BusinessException(
        ErrorCode.RBAC_ROLE_NOT_FOUND,
        `Vai trò phân quyền với mã ID ${id} không tồn tại trên hệ thống.`,
      );
    }

    const formattedPermissions = (role.rolePermissions || [])
      .filter((rp) => rp.permission)
      .map((rp) => ({
        id: Number(rp.permission.id),
        code: rp.permission.code,
        name: rp.permission.name,
        module: rp.permission.module,
      }));

    return {
      id: Number(role.id),
      code: role.code,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: formattedPermissions,
    };
  }

  // POST /api/v1/roles
  async create(dto: CreateRoleDto): Promise<any> {
    const { code, name, description, permissionIds } = dto;

    const existingRole = await this.roleRepository.findByCodeOrName(code, name);
    if (existingRole) {
      const isCodeMatch = existingRole.code === code;
      throw new ConflictException({
        message: `Thông tin ${isCodeMatch ? 'Mã vai trò' : 'Tên hiển thị'} đã tồn tại trong hệ thống.`,
        errorCode: isCodeMatch
          ? 'ROLE_CODE_ALREADY_EXISTS'
          : 'ROLE_NAME_ALREADY_EXISTS',
      });
    }

    if (code.startsWith('SYS_')) {
      throw new ConflictException({
        message:
          'Thao tác bị từ chối. Tiền tố "SYS_" được bảo lưu cho các cấu trúc lõi của hệ thống.',
        errorCode: 'RESERVED_PREFIX_RESTRICTION',
      });
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (permissionIds && permissionIds.length > 0) {
        const uniqueIds = [...new Set(permissionIds)].map((id) => String(id));
        const validPermissions = await queryRunner.manager.find(Permission, {
          where: { id: In(uniqueIds) },
        });

        if (validPermissions.length !== uniqueIds.length) {
          throw new UnprocessableEntityException({
            message:
              'Danh sách mã quyền (permissionIds) chứa một hoặc nhiều ID không hợp lệ trên hệ thống.',
            errorCode: 'INVALID_PERMISSION_ID',
          });
        }
      }

      const roleInstance = queryRunner.manager.create(Role, {
        code,
        name,
        description,
        isSystem: false,
      });
      const savedRole = await queryRunner.manager.save(Role, roleInstance);

      if (permissionIds && permissionIds.length > 0) {
        const uniqueIds = [...new Set(permissionIds)];
        const rolePermissionInstances = uniqueIds.map((pId) =>
          queryRunner.manager.create(RolePermission, {
            role: savedRole,
            permission: { id: String(pId) } as any,
          }),
        );
        await queryRunner.manager.save(RolePermission, rolePermissionInstances);
      }

      await queryRunner.commitTransaction();

      return {
        id: Number(savedRole.id),
        code: savedRole.code,
        name: savedRole.name,
        description: savedRole.description,
        isSystem: savedRole.isSystem,
        createdAt: savedRole.createdAt,
        updatedAt: savedRole.updatedAt,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // PUT /api/v1/roles/:id
  async update(id: number, dto: UpdateRoleDto): Promise<any> {
    const { name, description } = dto;
    const roleIdStr = String(id);

    const role = await this.roleRepository.findById(roleIdStr);
    if (!role) {
      throw new BusinessException(
        ErrorCode.RBAC_ROLE_NOT_FOUND,
        'Vai trò cần cập nhật không tồn tại trong hệ thống.',
      );
    }

    if (role.isSystem || ['SUPER_ADMIN', 'CUSTOMER'].includes(role.code)) {
      throw new BusinessException(
        ErrorCode.RBAC_SYSTEM_ROLE_IMMUTABLE,
        'Thao tác bị từ chối. Không được phép chỉnh sửa các vai trò mặc định cốt lõi của hệ thống.',
        403,
      );
    }

    if (name !== role.name) {
      const existingName = await this.roleRepository.findByName(
        name,
        roleIdStr,
      );
      if (existingName) {
        throw new ConflictException({
          message:
            'Tên hiển thị vai trò này đã được sử dụng bởi một vai trò khác.',
          errorCode: 'ROLE_NAME_ALREADY_EXISTS',
        });
      }
    }

    role.name = name;
    role.description = description ?? role.description;
    const updatedRole = await this.roleRepository.save(role);

    // Phát domain event để invalidate cache
    this.eventEmitter.emit(
      new RolePermissionsChangedEvent(
        roleIdStr,
        updatedRole.code,
        'sync',
      ).getEventName(),
      new RolePermissionsChangedEvent(roleIdStr, updatedRole.code, 'sync'),
    );

    return {
      id: Number(updatedRole.id),
      code: updatedRole.code,
      name: updatedRole.name,
      description: updatedRole.description,
      isSystem: updatedRole.isSystem,
      createdAt: updatedRole.createdAt,
      updatedAt: updatedRole.updatedAt,
    };
  }

  // DELETE /api/v1/roles/:id
  async delete(id: number): Promise<any> {
    const roleIdStr = String(id);

    const role = await this.roleRepository.findById(roleIdStr);
    if (!role) {
      throw new BusinessException(
        ErrorCode.RBAC_ROLE_NOT_FOUND,
        'Vai trò yêu cầu xóa không tồn tại trong hệ thống.',
      );
    }

    const protectedSystemCodes = [
      'SUPER_ADMIN',
      'CINEMA_MANAGER',
      'CINEMA_STAFF',
      'AI_AGENT',
      'CUSTOMER',
    ];
    if (role.isSystem || protectedSystemCodes.includes(role.code)) {
      throw new BusinessException(
        ErrorCode.RBAC_SYSTEM_ROLE_IMMUTABLE,
        `Thao tác bị từ chối. Vai trò '${role.code}' là cấu trúc mặc định cốt lõi của hệ thống và không thể xóa.`,
        403,
      );
    }

    const assignedUsersCount =
      await this.roleRepository.countUsersAssigned(roleIdStr);

    if (assignedUsersCount > 0) {
      throw new ConflictException({
        message: `Không thể xóa vai trò này vì đang có ${assignedUsersCount} tài khoản người dùng đang được gán quyền hạn này. Vui lòng điều chuyển nhân sự trước.`,
        errorCode: 'ROLE_IN_USE_BY_USERS',
      });
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.delete(RolePermission, {
        role: { id: roleIdStr },
      });
      await queryRunner.manager.delete(Role, { id: roleIdStr });

      await queryRunner.commitTransaction();

      // Phát event xóa cache
      this.eventEmitter.emit(
        new RolePermissionsChangedEvent(
          roleIdStr,
          role.code,
          'revoke',
        ).getEventName(),
        new RolePermissionsChangedEvent(roleIdStr, role.code, 'revoke'),
      );

      return {
        deletedRoleId: Number(roleIdStr),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
