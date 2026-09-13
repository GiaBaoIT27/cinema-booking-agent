import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, In, DataSource, Not } from 'typeorm';
import { Role } from '../entities/role.entity.js';
import { QueryRolesDto } from '../dto/role/query-roles.dto.js';
import { CreateRoleDto } from '../dto/role/create-role.dto.js';
import { Permission } from '../entities/permission.entity.js';
import { RolePermission } from '../entities/role-permission.entity.js';
import { UpdateRoleDto } from '../dto/role/update-role.dto.js';
import { UserRole } from '../entities/user-role.entity.js';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly dataSource: DataSource,
  ) {}

  //GET /api/v1/roles
  async findAll(query: QueryRolesDto): Promise<any> {
    const { keyword, page = 1, limit = 20 } = query;

    const queryBuilder = this.roleRepository
      .createQueryBuilder('role')
      .select([
        'role.id',
        'role.code',
        'role.name',
        'role.description',
        'role.isSystem',
        'role.createdAt',
        'role.updatedAt',
      ]);

    // 1. Tìm kiếm theo keyword (Case-insensitive ILIKE) [1.2]
    if (keyword) {
      const formattedKeyword = `%${keyword.trim()}%`;
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('role.code ILIKE :keyword', {
            keyword: formattedKeyword,
          }).orWhere('role.name ILIKE :keyword', { keyword: formattedKeyword });
        }),
      );
    }

    // 2. Thiết lập Sắp xếp & Phân trang [1.2]
    queryBuilder
      .orderBy('role.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    // 3. Thực thi lấy dữ liệu và đếm tổng phần tử
    const [items, totalElements] = await queryBuilder.getManyAndCount();

    // 4. Map dữ liệu sạch và ép kiểu ID bigint về number/string khớp Response Schema (1.3)
    const formattedData = items.map((role) => ({
      id: Number(role.id), // Ép kiểu về number khớp cấu hình 1.3 của bạn
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
        totalElements,
        totalPages: Math.ceil(totalElements / limit),
      },
    };
  }

  //GET /api/v1/roles/:id
  async findById(id: number): Promise<any> {
    // 1. Truy vấn chi tiết Role lồng quan hệ sang RolePermission và sang thực thể Permission gốc \
    const role = await this.roleRepository.findOne({
      where: { id: String(id) }, // Ép sang String để tương thích an toàn với database bigint
      relations: {
        rolePermissions: {
          permission: true, // Nạp trực tiếp metadata của Permission
        },
      },
    });

    // 2. Kiểm tra sự tồn tại của Vai trò (ROLE_NOT_FOUND)
    if (!role) {
      throw new NotFoundException({
        message: `Vai trò phân quyền với mã ID ${id} không tồn tại trên hệ thống.`,
        errorCode: 'ROLE_NOT_FOUND',
      });
    }

    // 3. Phẳng hóa mảng liên kết RolePermission thành cấu trúc đối tượng Permission sạch
    const formattedPermissions = (role.rolePermissions || [])
      .filter((rp) => rp.permission) // Phòng vệ nếu bản ghi liên kết bị mồ côi
      .map((rp) => ({
        id: Number(rp.permission.id), // Đưa về dạng số nguyên theo đặc tả
        code: rp.permission.code,
        name: rp.permission.name,
        module: rp.permission.module,
      }));

    // 4. Định dạng Output khớp chính xác 100% với Response Schema (2.3)
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

  //POST /api/v1/roles
  async create(dto: CreateRoleDto): Promise<any> {
    const { code, name, description, permissionIds } = dto;

    // 1. Kiểm tra trùng lặp mã code hoặc tên hiển thị
    const existingRole = await this.roleRepository.findOne({
      where: [{ code }, { name }],
    });

    if (existingRole) {
      const errorCode =
        existingRole.code === code
          ? 'ROLE_CODE_ALREADY_EXISTS'
          : 'ROLE_NAME_ALREADY_EXISTS';
      throw new ConflictException({
        message: `Thông tin ${existingRole.code === code ? 'Mã vai trò' : 'Tên hiển thị'} đã tồn tại trong hệ thống.`,
        errorCode,
      });
    }

    // 2. Bảo vệ Tiền tố Hệ thống (Reserved Prefix Constraint) [3.2]
    if (code.startsWith('SYS_')) {
      throw new ConflictException({
        message:
          'Thao tác bị từ chối. Tiền tố "SYS_" được bảo lưu cho các cấu trúc lõi của hệ thống.',
        errorCode: 'RESERVED_PREFIX_RESTRICTION',
      });
    }

    // Khởi tạo QueryRunner để mở ACID Transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 3. Kiểm tra tính hợp lệ của mảng permissionIds (nếu có truyền)
      if (permissionIds && permissionIds.length > 0) {
        const uniqueIds = [...new Set(permissionIds)].map((id) => String(id));

        // Tìm kiếm các quyền thực tế tồn tại trong DB khớp với danh sách ID gửi lên
        const validPermissions = await queryRunner.manager.find(Permission, {
          where: { id: In(uniqueIds) },
        });

        // Nếu số lượng quyền tìm thấy không khớp với số lượng ID độc nhất gửi lên -> Có ID lậu/sai lệch
        if (validPermissions.length !== uniqueIds.length) {
          throw new UnprocessableEntityException({
            message:
              'Danh sách mã quyền (permissionIds) chứa một hoặc nhiều ID không hợp lệ trên hệ thống.',
            errorCode: 'INVALID_PERMISSION_ID',
          });
        }
      }

      // 4. Step 1: Khởi tạo và ghi thông tin bảng Role
      const roleInstance = queryRunner.manager.create(Role, {
        code,
        name,
        description,
        isSystem: false, // Mặc định tự tạo là false
      });
      const savedRole = await queryRunner.manager.save(Role, roleInstance);

      // 5. Step 2: Ghi dữ liệu hàng loạt vào bảng trung gian nếu có quyền đi kèm
      if (permissionIds && permissionIds.length > 0) {
        const uniqueIds = [...new Set(permissionIds)];
        const rolePermissionInstances = uniqueIds.map((pId) =>
          queryRunner.manager.create(RolePermission, {
            role: savedRole,
            permission: { id: String(pId) } as any, // Ép kiểu để khớp cấu trúc bigint/string DB
          }),
        );
        await queryRunner.manager.save(RolePermission, rolePermissionInstances);
      }

      // Commit toàn bộ dữ liệu an toàn
      await queryRunner.commitTransaction();

      // 6. Định dạng cấu trúc trả
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
      // Rollback hoàn nguyên dữ liệu nếu xảy ra sự cố bất kỳ
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Giải phóng kết nối
      await queryRunner.release();
    }
  }

  //PUT /api/v1/roles/:id liên quan đến Redis
  async update(id: number, dto: UpdateRoleDto): Promise<any> {
    const { name, description } = dto;
    const roleIdStr = String(id);

    // 1. Kiểm tra Tồn tại của Vai trò cần cập nhật
    const role = await this.roleRepository.findOne({
      where: { id: roleIdStr },
    });
    if (!role) {
      throw new NotFoundException({
        message: 'Vai trò cần cập nhật không tồn tại trong hệ thống.',
        errorCode: 'ROLE_NOT_FOUND',
      });
    }

    // 2. Bảo vệ Vai trò Hệ thống
    // Sử dụng cờ 'isSystem' đã bổ sung ở bước trước hoặc check cứng mã code cốt lõi
    if (role.isSystem || ['SUPER_ADMIN', 'CUSTOMER'].includes(role.code)) {
      throw new ForbiddenException({
        message:
          'Thao tác bị từ chối. Không được phép chỉnh sửa các vai trò mặc định cốt lõi của hệ thống.',
        errorCode: 'PROTECTED_SYSTEM_ROLE_CANNOT_BE_MODIFIED',
      });
    }

    // 3. Kiểm tra Trùng Tên hiển thị với vai trò khác
    if (name !== role.name) {
      const existingName = await this.roleRepository.findOne({
        where: {
          name,
          id: Not(roleIdStr), // Ràng buộc id != :id
        },
      });

      if (existingName) {
        throw new ConflictException({
          message:
            'Tên hiển thị vai trò này đã được sử dụng bởi một vai trò khác.',
          errorCode: 'ROLE_NAME_ALREADY_EXISTS',
        });
      }
    }

    // 4. Tiến hành cập nhật dữ liệu
    role.name = name;
    role.description = description ?? role.description;
    const updatedRole = await this.roleRepository.save(role);

    // 5. Xóa Cache (Cache Eviction) để làm mới authorization context [4.2]
    // await this.redisService.del(`cache:role:${roleIdStr}`);

    // 6. Trả về cấu trúc hồ sơ sạch sau khi cập nhật thành công
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

  //DELETE /api/v1/roles/:id
  async delete(id: number): Promise<any> {
    const roleIdStr = String(id);

    // 1. Kiểm tra Tồn tại của Vai trò cần xóa
    const role = await this.roleRepository.findOne({
      where: { id: roleIdStr },
    });
    if (!role) {
      throw new NotFoundException({
        message: 'Vai trò yêu cầu xóa không tồn tại trong hệ thống.',
        errorCode: 'ROLE_NOT_FOUND',
      });
    }

    // 2. Kiểm tra Vai trò Cốt lõi Hệ thống (System Protection Gatekeeper) [6.2]
    const protectedSystemCodes = [
      'SUPER_ADMIN',
      'CINEMA_MANAGER',
      'CINEMA_STAFF',
      'AI_AGENT',
      'CUSTOMER',
    ];
    if (role.isSystem || protectedSystemCodes.includes(role.code)) {
      throw new ForbiddenException({
        message: `Thao tác bị từ chối. Vai trò '${role.code}' là cấu trúc mặc định cốt lõi của hệ thống và không thể xóa.`,
        errorCode: 'CANNOT_DELETE_SYSTEM_ROLE',
      });
    }

    // 3. Kiểm tra Quyền Sở Hữu Người Dùng
    // Sử dụng queryRunner hoặc manager để đếm số lượng nhân sự đang giữ role này
    const assignedUsersCount = await this.dataSource.manager.count(UserRole, {
      where: { role: { id: roleIdStr } },
    });

    if (assignedUsersCount > 0) {
      throw new ConflictException({
        message: `Không thể xóa vai trò này vì đang có ${assignedUsersCount} tài khoản người dùng đang được gán quyền hạn này. Vui lòng điều chuyển nhân sự trước.`,
        errorCode: 'ROLE_IN_USE_BY_USERS',
      });
    }

    // Khởi tạo QueryRunner khởi động ACID Transaction [6.2]
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Step 1: Xóa sạch toàn bộ liên kết ma trận quyền hạn trong bảng trung gian role_permissions
      await queryRunner.manager.delete(RolePermission, {
        role: { id: roleIdStr },
      });

      // Step 2: Xóa bản ghi chính trong bảng roles
      await queryRunner.manager.delete(Role, { id: roleIdStr });

      // Commit toàn bộ thay đổi dữ liệu an toàn
      await queryRunner.commitTransaction();

      // 4. Trả về đúng định dạng dữ liệu phản hồi khớp 100% với Response Schema (6.3)
      return {
        deletedRoleId: Number(roleIdStr),
      };
    } catch (error) {
      // Hoàn nguyên dữ liệu nếu quá trình xóa gặp sự cố xung đột ngoại khóa ngầm
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Giải phóng kết nối
      await queryRunner.release();
    }
  }
}
