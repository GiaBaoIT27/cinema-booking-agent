import { ConflictException, Injectable, Inject } from '@nestjs/common';
import { PERMISSION_REPOSITORY } from '../../domain/repositories/permission.repository.interface.js';
import type { IPermissionRepository } from '../../domain/repositories/permission.repository.interface.js';
import { QueryPermissionsDto } from '../dto/query-permissions.dto.js';
import { CreatePermissionDto } from '../dto/create-permission.dto.js';
import { UpdatePermissionDto } from '../dto/update-permission.dto.js';
import { ErrorCode } from '#src/common/constants/error-codes.enum.js';
import { BusinessException } from '#src/common/exceptions/business.exception.js';

@Injectable()
export class PermissionsService {
  constructor(
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissionRepository: IPermissionRepository,
  ) {}

  // GET /api/v1/permissions
  async findAll(query: QueryPermissionsDto): Promise<any> {
    const { module, search, page = 1, limit = 20 } = query;

    const { items, total } = await this.permissionRepository.findAll({
      module,
      search,
      page,
      limit,
    });

    const formattedData = items.map((permission) => ({
      id: Number(permission.id),
      code: permission.code,
      name: permission.name,
      module: permission.module,
      description: permission.description,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
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

  // GET /api/v1/permissions/modules
  async getModules(): Promise<any> {
    const moduleDisplayMap: Record<string, string> = {
      MOVIE: 'Quản lý Danh mục Phim',
      SHOWTIME: 'Quản lý Lịch chiếu & Phòng chiếu',
      TICKET: 'Quản lý Bán vé & Soát vé',
      FINANCE: 'Quản lý Tài chính & Doanh thu',
      INVENTORY: 'Quản lý Kho & Combo F&B',
      USER: 'Quản lý Tài khoản người dùng',
      ROLE: 'Quản lý Vai trò & Phân quyền',
    };

    const stats = await this.permissionRepository.getModuleStats();

    return stats.map((row) => ({
      module: row.module,
      displayName: moduleDisplayMap[row.module] || `Phân hệ ${row.module}`,
      totalPermissions: row.totalPermissions,
    }));
  }

  // GET /api/v1/permissions/:id
  async findById(id: number): Promise<any> {
    const permission = await this.permissionRepository.findById(String(id));

    if (!permission) {
      throw new BusinessException(
        ErrorCode.RBAC_PERMISSION_NOT_FOUND,
        `Mã quyền hạn hệ thống với ID ${id} không tồn tại.`,
      );
    }

    const formattedRoles = (permission.rolePermissions || [])
      .filter((rp) => rp.role)
      .map((rp) => ({
        id: Number(rp.role.id),
        code: rp.role.code,
        name: rp.role.name,
      }));

    return {
      id: Number(permission.id),
      code: permission.code,
      name: permission.name,
      module: permission.module,
      description: permission.description,
      assignedRoles: formattedRoles,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
    };
  }

  // POST /api/v1/permissions
  async create(dto: CreatePermissionDto): Promise<any> {
    const { code, name, module, description } = dto;

    const existingPermission = await this.permissionRepository.findByCode(code);
    if (existingPermission) {
      throw new BusinessException(
        ErrorCode.DATA_ALREADY_EXISTS,
        `Mã quyền hạn '${code}' đã tồn tại trong hệ thống và không thể khai báo trùng lặp.`,
      );
    }

    const permissionInstance = this.permissionRepository.create({
      code: code.trim(),
      name: name.trim(),
      module: module.trim(),
      description: description || null,
    });

    const savedPermission =
      await this.permissionRepository.save(permissionInstance);

    return {
      id: Number(savedPermission.id),
      code: savedPermission.code,
      name: savedPermission.name,
      module: savedPermission.module,
      description: savedPermission.description,
      createdAt: savedPermission.createdAt,
      updatedAt: savedPermission.updatedAt,
    };
  }

  // PUT /api/v1/permissions/:id
  async update(id: number, dto: UpdatePermissionDto): Promise<any> {
    const permission = await this.permissionRepository.findById(String(id));
    if (!permission) {
      throw new BusinessException(
        ErrorCode.RBAC_PERMISSION_NOT_FOUND,
        'Quyền thao tác yêu cầu chỉnh sửa không tồn tại trên hệ thống.',
      );
    }

    permission.name = dto.name.trim();
    permission.module = dto.module.trim();
    permission.description = dto.description ?? permission.description;

    const updatedPermission = await this.permissionRepository.save(permission);

    return {
      id: Number(updatedPermission.id),
      code: updatedPermission.code,
      module: updatedPermission.module,
      name: updatedPermission.name,
      description: updatedPermission.description,
      createdAt: updatedPermission.createdAt,
      updatedAt: updatedPermission.updatedAt,
    };
  }

  // DELETE /api/v1/permissions/:id
  async delete(id: number): Promise<any> {
    const permissionIdStr = String(id);

    const permission =
      await this.permissionRepository.findById(permissionIdStr);
    if (!permission) {
      throw new BusinessException(
        ErrorCode.RBAC_PERMISSION_NOT_FOUND,
        'Quyền thao tác yêu cầu xóa không tồn tại trên hệ thống.',
      );
    }

    const assignedRolesCount =
      await this.permissionRepository.countByRoleId(permissionIdStr);

    if (assignedRolesCount > 0) {
      throw new ConflictException({
        message: `Không thể xóa quyền này vì đang được gán cho ${assignedRolesCount} vai trò trong hệ thống.`,
        errorCode: 'PERMISSION_IN_USE_BY_ROLES',
        errors: [
          {
            field: 'id',
            message:
              'Hãy gỡ quyền này khỏi các vai trò liên quan trước khi thực hiện xóa.',
          },
        ],
      } as any);
    }

    await this.permissionRepository.delete(permissionIdStr);

    return {
      deletedPermissionId: Number(permissionIdStr),
    };
  }
}
