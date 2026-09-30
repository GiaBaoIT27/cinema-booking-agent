import {
  Injectable,
  UnprocessableEntityException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Role } from '../../domain/entities/role.entity.js';
import { Permission } from '../../domain/entities/permission.entity.js';
import { RolePermission } from '../../domain/entities/role-permission.entity.js';
import { QueryRolePermissionsDto } from '../dto/query-role-permissions.dto.js';
import { UpdateRolePermissionsDto } from '../dto/update-role-permissions.dto.js';
import { AppendRolePermissionsDto } from '../dto/append-role-permissions.dto.js';
import { ROLE_REPOSITORY } from '../../domain/repositories/role.repository.interface.js';
import type { IRoleRepository } from '../../domain/repositories/role.repository.interface.js';
import { PERMISSION_REPOSITORY } from '../../domain/repositories/permission.repository.interface.js';
import type { IPermissionRepository } from '../../domain/repositories/permission.repository.interface.js';
import { RolePermissionsChangedEvent } from '../../domain/events/role-permissions-changed.event.js';
import { ErrorCode } from '#src/common/constants/error-codes.enum.js';
import { BusinessException } from '#src/common/exceptions/business.exception.js';

@Injectable()
export class RolePermissionsService {
  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: IRoleRepository,
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissionRepository: IPermissionRepository,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // GET /api/v1/roles/:roleId/permissions
  async getRolePermissions(
    roleId: number,
    query: QueryRolePermissionsDto,
  ): Promise<any> {
    const { grouped, module } = query;
    const roleIdStr = String(roleId);

    const role = await this.roleRepository.findById(roleIdStr);
    if (!role) {
      throw new BusinessException(
        ErrorCode.RBAC_ROLE_NOT_FOUND,
        `Vai trò với mã định danh ID ${roleId} không tồn tại trên hệ thống.`,
      );
    }

    const queryBuilder = this.dataSource.manager
      .createQueryBuilder(RolePermission, 'rp')
      .innerJoinAndSelect('rp.permission', 'p')
      .where('rp.role_id = :roleId', { roleId: roleIdStr });

    if (module) {
      queryBuilder.andWhere('p.module = :module', { module });
    }

    queryBuilder.orderBy('p.module', 'ASC').addOrderBy('p.code', 'ASC');

    const rolePermissions = await queryBuilder.getMany();

    if (grouped) {
      const groupMap = rolePermissions.reduce(
        (acc, rp) => {
          const p = rp.permission;
          if (!acc[p.module]) {
            acc[p.module] = [];
          }
          acc[p.module].push({
            id: Number(p.id),
            code: p.code,
            name: p.name,
            description: p.description,
            assignedAt: rp.createdAt,
          });
          return acc;
        },
        {} as Record<string, any[]>,
      );

      const groupedPermissions = Object.keys(groupMap).map((moduleKey) => ({
        module: moduleKey,
        permissions: groupMap[moduleKey],
      }));

      return {
        roleId: Number(role.id),
        roleCode: role.code,
        roleName: role.name,
        totalPermissions: rolePermissions.length,
        groupedPermissions,
      };
    }

    const flatPermissions = rolePermissions.map((rp) => ({
      id: Number(rp.permission.id),
      code: rp.permission.code,
      name: rp.permission.name,
      module: rp.permission.module,
      description: rp.permission.description,
      assignedAt: rp.createdAt,
    }));

    return {
      roleId: Number(role.id),
      roleCode: role.code,
      roleName: role.name,
      totalPermissions: rolePermissions.length,
      permissions: flatPermissions,
    };
  }

  // PUT /api/v1/roles/:id/permissions
  async updatePermissions(
    id: number,
    dto: UpdateRolePermissionsDto,
  ): Promise<any> {
    const { permissionIds = [] } = dto;
    const roleIdStr = String(id);

    const roleExists = await this.roleRepository.findById(roleIdStr);
    if (!roleExists) {
      throw new BusinessException(
        ErrorCode.RBAC_ROLE_NOT_FOUND,
        'Vai trò phân quyền cần cấu hình ma trận không tồn tại.',
      );
    }

    if (roleExists.code === 'SUPER_ADMIN') {
      throw new BusinessException(
        ErrorCode.RBAC_SYSTEM_ROLE_IMMUTABLE,
        'Thao tác bị từ chối. Danh sách quyền hạn của tài khoản quản trị tối cao là bất biến.',
        403,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('READ COMMITTED');

    try {
      const role = await queryRunner.manager.findOne(Role, {
        where: { id: roleIdStr },
        lock: { mode: 'pessimistic_write' },
      });

      if (permissionIds.length > 0) {
        const uniqueIdsStr = permissionIds.map((pId) => String(pId));
        const validPermissionsCount = await queryRunner.manager.count(
          Permission,
          {
            where: { id: In(uniqueIdsStr) },
          },
        );

        if (validPermissionsCount !== permissionIds.length) {
          throw new UnprocessableEntityException({
            message:
              'Ma trận quyền gửi lên chứa một hoặc nhiều mã ID quyền không tồn tại trong hệ thống.',
            errorCode: 'INVALID_PERMISSION_IDS_PROVIDED',
          });
        }
      }

      await queryRunner.manager.delete(RolePermission, {
        role: { id: roleIdStr },
      });

      if (permissionIds.length > 0) {
        const rolePermissionInstances = permissionIds.map((pId) =>
          queryRunner.manager.create(RolePermission, {
            role: role!,
            permission: { id: String(pId) } as any,
          }),
        );
        await queryRunner.manager.save(RolePermission, rolePermissionInstances);
      }

      await queryRunner.commitTransaction();

      // Phát event để Invalidate Cache phân quyền của Role này
      this.eventEmitter.emit(
        new RolePermissionsChangedEvent(
          roleIdStr,
          role!.code,
          'sync',
        ).getEventName(),
        new RolePermissionsChangedEvent(roleIdStr, role!.code, 'sync'),
      );

      return {
        roleId: Number(role!.id),
        roleCode: role!.code,
        totalPermissionsAssigned: permissionIds.length,
        assignedPermissionIds: permissionIds,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // POST /api/v1/roles/:id/permissions/append
  async appendPermissions(
    roleId: number,
    dto: AppendRolePermissionsDto,
  ): Promise<any> {
    const { permissionIds } = dto;
    const roleIdStr = String(roleId);

    const roleExists = await this.roleRepository.findById(roleIdStr);
    if (!roleExists) {
      throw new BusinessException(
        ErrorCode.RBAC_ROLE_NOT_FOUND,
        'Vai trò yêu cầu gán bổ sung quyền không tồn tại.',
      );
    }

    const uniqueIdsStr = permissionIds.map((pId) => String(pId));
    const validPermissionsCount = await this.dataSource.manager.count(
      Permission,
      {
        where: { id: In(uniqueIdsStr) },
      },
    );

    if (validPermissionsCount !== permissionIds.length) {
      throw new BusinessException(
        ErrorCode.RBAC_PERMISSION_NOT_FOUND,
        'Danh sách gán bổ sung chứa một hoặc nhiều mã quyền không tồn tại trên hệ thống.',
        404,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingRelations = await queryRunner.manager.find(RolePermission, {
        where: {
          role: { id: roleIdStr },
          permission: { id: In(uniqueIdsStr) },
        },
        relations: { permission: true },
      });

      const existingPermissionIds = existingRelations.map((rel) =>
        Number(rel.permissionId),
      );

      const newlyAddedPermissionIds = permissionIds.filter(
        (id) => !existingPermissionIds.includes(id),
      );

      if (newlyAddedPermissionIds.length > 0) {
        const insertValues = newlyAddedPermissionIds.map((pId) => ({
          roleId: roleIdStr,
          permissionId: String(pId),
        }));

        await queryRunner.manager
          .createQueryBuilder()
          .insert()
          .into(RolePermission)
          .values(insertValues)
          .orIgnore()
          .execute();
      }

      await queryRunner.commitTransaction();

      const totalPermissionsAssigned = await this.dataSource.manager.count(
        RolePermission,
        {
          where: { role: { id: roleIdStr } },
        },
      );

      // Phát event để Invalidate Cache phân quyền của Role này
      this.eventEmitter.emit(
        new RolePermissionsChangedEvent(
          roleIdStr,
          roleExists.code,
          'append',
        ).getEventName(),
        new RolePermissionsChangedEvent(roleIdStr, roleExists.code, 'append'),
      );

      return {
        roleId: Number(roleIdStr),
        newlyAddedPermissionIds: newlyAddedPermissionIds,
        totalPermissionsAssigned: totalPermissionsAssigned,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // DELETE /api/v1/roles/:roleId/permissions/:permissionId
  async revokePermission(roleId: number, permissionId: number): Promise<any> {
    const roleIdStr = String(roleId);
    const permissionIdStr = String(permissionId);

    const role = await this.roleRepository.findById(roleIdStr);
    if (!role) {
      throw new BusinessException(
        ErrorCode.RBAC_ROLE_NOT_FOUND,
        'Vai trò yêu cầu thu hồi quyền không tồn tại trên hệ thống.',
      );
    }

    if (role.code === 'SUPER_ADMIN') {
      throw new BusinessException(
        ErrorCode.RBAC_SYSTEM_ROLE_IMMUTABLE,
        'Thao tác bị từ chối. Không được phép rút bớt hoặc sửa đổi quyền hạn của tài khoản quản trị tối cao.',
        403,
      );
    }

    const mappingCount = await this.dataSource.manager.count(RolePermission, {
      where: {
        roleId: roleIdStr,
        permissionId: permissionIdStr,
      },
    });

    if (mappingCount === 0) {
      throw new BusinessException(
        ErrorCode.RESOURCE_NOT_FOUND,
        'Liên kết phân quyền giữa vai trò và mã quyền này không tồn tại hoặc đã bị thu hồi trước đó.',
        404,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.delete(RolePermission, {
        roleId: roleIdStr,
        permissionId: permissionIdStr,
      });

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
        roleId: Number(roleIdStr),
        revokedPermissionId: Number(permissionIdStr),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
