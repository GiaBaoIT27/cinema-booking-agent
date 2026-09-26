import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Role } from '../entities/role.entity.js';
import { Permission } from '../entities/permission.entity.js';
import { RolePermission } from '../entities/role-permission.entity.js';
import { QueryRolePermissionsDto } from '../dto/role-permission/query-role-permissions.dto.js';
import { UpdateRolePermissionsDto } from '../dto/role-permission/update-role-permissions.dto.js';
import { AppendRolePermissionsDto } from '../dto/role-permission/append-role-permissions.dto.js';

@Injectable()
export class RolePermissionsService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    private readonly dataSource: DataSource,
  ) {}

  //GET /api/v1/roles/:roleId/permissions
  async getRolePermissions(
    roleId: number,
    query: QueryRolePermissionsDto,
  ): Promise<any> {
    const { grouped, module } = query;
    const roleIdStr = String(roleId);

    // 1. Kiểm tra sự tồn tại của Vai trò (ROLE_NOT_FOUND)
    const role = await this.roleRepository.findOne({
      where: { id: roleIdStr },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    if (!role) {
      throw new NotFoundException({
        message: `Vai trò với mã định danh ID ${roleId} không tồn tại trên hệ thống.`,
        errorCode: 'ROLE_NOT_FOUND',
      });
    }

    // 2. Thực hiện INNER JOIN giữa bảng trung gian và bảng permissions gốc
    const queryBuilder = this.roleRepository.manager
      .createQueryBuilder(RolePermission, 'rp')
      .innerJoinAndSelect('rp.permission', 'p')
      .where('rp.role_id = :roleId', { roleId: roleIdStr });

    // Lọc theo phân hệ cụ thể nếu có truyền module
    if (module) {
      queryBuilder.andWhere('p.module = :module', { module });
    }

    // Sắp xếp đa tầng đa chỉ mục đúng theo đặc tả [1.2]
    queryBuilder.orderBy('p.module', 'ASC').addOrderBy('p.code', 'ASC');

    const rolePermissions = await queryBuilder.getMany();

    // 3. Xử lý phân nhánh Output dựa trên cờ 'grouped'
    if (grouped) {
      // Giải thuật Gom nhóm mảng phẳng thành mảng cấu trúc lồng theo Phân hệ (Module Grouping)
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

      // Trả về định dạng cấu trúc bọc dữ liệu Gom nhóm (1.3.b)
      return {
        roleId: Number(role.id),
        roleCode: role.code,
        roleName: role.name,
        totalPermissions: rolePermissions.length,
        groupedPermissions,
      };
    }

    // Dạng mặc định (grouped=false): Map mảng phẳng sạch dữ liệu (1.3.a)
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

  //PUT /api/v1/roles/:id/permissions liên quan dến Redis
  async updatePermissions(
    id: number,
    dto: UpdateRolePermissionsDto,
  ): Promise<any> {
    const { permissionIds = [] } = dto;
    const roleIdStr = String(id);

    // 1. Kiểm tra Tồn tại của Role trước khi mở transaction nặng
    const roleExists = await this.roleRepository.findOne({
      where: { id: roleIdStr },
    });
    if (!roleExists) {
      throw new NotFoundException({
        message: 'Vai trò phân quyền cần cấu hình ma trận không tồn tại.',
        errorCode: 'ROLE_NOT_FOUND',
      });
    }

    // 2. Quy tắc Bất biến đối với Super Admin (Super Admin Immutability Rule)
    if (roleExists.code === 'SUPER_ADMIN') {
      throw new ForbiddenException({
        message:
          'Thao tác bị từ chối. Danh sách quyền hạn của tài khoản quản trị tối cao là bất biến.',
        errorCode: 'SUPER_ADMIN_PERMISSIONS_IMMUTABLE',
      });
    }

    // Khởi tạo QueryRunner chạy Transaction với mức cô lập READ COMMITTED
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('READ COMMITTED');

    try {
      // 3. Khóa dòng bản ghi Role chống tranh chấp đồng thời bằng Pessimistic Write (SELECT ... FOR UPDATE)
      const role = await queryRunner.manager.findOne(Role, {
        where: { id: roleIdStr },
        lock: { mode: 'pessimistic_write' },
      });

      // 4. Xác thực danh sách quyền đầu vào (Nếu mảng không rỗng)
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

      // 5. Thực thi Sync Strategy: Xóa toàn bộ liên kết quyền cũ (Delete)
      await queryRunner.manager.delete(RolePermission, {
        role: { id: roleIdStr },
      });

      // 6. Thực hiện nạp hàng loạt quyền mới nếu mảng có phần tử (Batch Insert)
      if (permissionIds.length > 0) {
        const rolePermissionInstances = permissionIds.map((pId) =>
          queryRunner.manager.create(RolePermission, {
            role: role!,
            permission: { id: String(pId) } as any,
          }),
        );
        await queryRunner.manager.save(RolePermission, rolePermissionInstances);
      }

      // Commit transaction an toàn giải phóng database lock
      await queryRunner.commitTransaction();

      // 7. Thu Hồi Session & Cache Invalidation diện rộng trên hạ tầng Redis [5.2]
      // Tìm kiếm toàn bộ active users thuộc role_id này để xóa cache phân quyền / buộc reload token
      // const activeUserSessionKeys = await this.redisService.keys(`auth:user:role:${roleIdStr}:*`);
      // if (activeUserSessionKeys.length > 0) {
      //   await this.redisService.del(activeUserSessionKeys);
      // }

      // 8. Định dạng dữ liệu phản hồi khớp chính xác Response Schema (5.3)
      return {
        roleId: Number(role!.id),
        roleCode: role!.code,
        totalPermissionsAssigned: permissionIds.length,
        assignedPermissionIds: permissionIds,
      };
    } catch (error) {
      // Rollback hoàn nguyên dữ liệu nếu xảy ra xung đột hoặc crash hệ thống
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Giải phóng kết nối về Connection Pool
      await queryRunner.release();
    }
  }

  // POST /api/v1/roles/:id/permissions/append liên quan đến Redis
  async appendPermissions(
    roleId: number,
    dto: AppendRolePermissionsDto,
  ): Promise<any> {
    const { permissionIds } = dto;
    const roleIdStr = String(roleId);

    // 1. Kiểm tra Tồn tại Role
    const roleExists = await this.roleRepository.findOne({
      where: { id: roleIdStr },
      select: { id: true },
    });

    if (!roleExists) {
      throw new NotFoundException({
        message: 'Vai trò yêu cầu gán bổ sung quyền không tồn tại.',
        errorCode: 'ROLE_NOT_FOUND',
      });
    }

    // 2. Xác thực tính tồn tại của tất cả Permissions trong mảng đầu vào [3.2]
    const uniqueIdsStr = permissionIds.map((pId) => String(pId));
    const validPermissionsCount = await this.roleRepository.manager.count(
      Permission,
      {
        where: { id: In(uniqueIdsStr) },
      },
    );

    if (validPermissionsCount !== permissionIds.length) {
      throw new NotFoundException({
        message:
          'Danh sách gán bổ sung chứa một hoặc nhiều mã quyền không tồn tại trên hệ thống.',
        errorCode: 'ONE_OR_MORE_PERMISSIONS_NOT_FOUND',
      });
    }

    // Khởi động Database Transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 3. Tìm các quyền ĐÃ ĐƯỢC GÁN SẴN từ trước nhằm mục đích tính toán dữ liệu trả về
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

      // Tính toán danh sách thực sự là quyền mới chèn thêm phục vụ mảng "newlyAddedPermissionIds" ở Response
      const newlyAddedPermissionIds = permissionIds.filter(
        (id) => !existingPermissionIds.includes(id),
      );

      if (newlyAddedPermissionIds.length > 0) {
        // 4. Thực thi chèn dữ liệu lũy đẳng (ON CONFLICT DO NOTHING) sử dụng .orIgnore() của TypeORM
        const insertValues = newlyAddedPermissionIds.map((pId) => ({
          roleId: roleIdStr,
          permissionId: String(pId),
        }));

        await queryRunner.manager
          .createQueryBuilder()
          .insert()
          .into(RolePermission)
          .values(insertValues)
          .orIgnore() // Tương đương: ON CONFLICT (role_id, permission_id) DO NOTHING [3.2]
          .execute();
      }

      // Commit dữ liệu an toàn
      await queryRunner.commitTransaction();

      // 5. Đếm tổng số quyền hiện tại đang được gán cho Role này sau khi cộng dồn [3.3]
      const totalPermissionsAssigned = await this.roleRepository.manager.count(
        RolePermission,
        {
          where: { role: { id: roleIdStr } },
        },
      );

      // Xóa Cache Authorization trên hạ tầng Redis
      // await this.redisService.del(`auth:user:role:${roleIdStr}:*`);

      // 6. Định dạng cấu trúc trả về khớp 100% với Response Schema (3.3)
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

  // DELETE /api/v1/roles/:roleId/permissions/:permissionId liên quan đến Redis
  async revokePermission(roleId: number, permissionId: number): Promise<any> {
    const roleIdStr = String(roleId);
    const permissionIdStr = String(permissionId);

    // 1. Kiểm tra Tồn tại Role
    const role = await this.roleRepository.findOne({
      where: { id: roleIdStr },
      select: { id: true, code: true },
    });

    if (!role) {
      throw new NotFoundException({
        message: 'Vai trò yêu cầu thu hồi quyền không tồn tại trên hệ thống.',
        errorCode: 'ROLE_NOT_FOUND',
      });
    }

    // 2. Bảo vệ Vai trò Super Admin cốt lõi
    if (role.code === 'SUPER_ADMIN') {
      throw new ForbiddenException({
        message:
          'Thao tác bị từ chối. Không được phép rút bớt hoặc sửa đổi quyền hạn của tài khoản quản trị tối cao.',
        errorCode: 'CANNOT_MODIFY_CORE_SUPER_ADMIN_PERMISSIONS',
      });
    }

    // 3. Kiểm tra Tồn tại của Liên kết
    const mappingCount = await this.roleRepository.manager.count(
      RolePermission,
      {
        where: {
          roleId: roleIdStr,
          permissionId: permissionIdStr,
        },
      },
    );

    if (mappingCount === 0) {
      throw new NotFoundException({
        message:
          'Liên kết phân quyền giữa vai trò và mã quyền này không tồn tại hoặc đã bị thu hồi trước đó.',
        errorCode: 'ROLE_PERMISSION_MAPPING_NOT_FOUND',
      });
    }

    // Khởi động Database Transaction [4.2]
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 4. Thực thi Xóa Bản Ghi liên kết
      await queryRunner.manager.delete(RolePermission, {
        roleId: roleIdStr,
        permissionId: permissionIdStr,
      });

      // Commit dữ liệu an toàn giải phóng tài nguyên
      await queryRunner.commitTransaction();

      // 5. Invalidate Cache: Xóa Redis Cache cho các Users thuộc Role này [4.2]
      // await this.redisService.del(`auth:user:role:${roleIdStr}:*`);

      // 6. Trả về kết quả thành công
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
