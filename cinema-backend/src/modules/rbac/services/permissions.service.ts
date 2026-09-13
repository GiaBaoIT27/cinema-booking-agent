import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Permission } from '../entities/permission.entity.js';
import { QueryPermissionsDto } from '../dto/permissions/query-permissions.dto.js';
import { CreatePermissionDto } from '../dto/permissions/create-permission.dto.js';
import { UpdatePermissionDto } from '../dto/permissions/update-permission.dto.js';
import { RolePermission } from '../entities/role-permission.entity.js';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  // GET /api/v1/permissions
  async findAll(query: QueryPermissionsDto): Promise<any> {
    const { module, search, page = 1, limit = 20 } = query;

    const queryBuilder = this.permissionRepository
      .createQueryBuilder('permission')
      .select([
        'permission.id',
        'permission.code',
        'permission.name',
        'permission.module',
        'permission.description',
        'permission.createdAt',
        'permission.updatedAt',
      ]);

    // 1. Lọc chính xác theo Phân hệ chức năng (đã được DTO tự động UPPER)
    if (module) {
      queryBuilder.andWhere('permission.module = :module', { module });
    }

    // 2. Tìm kiếm gộp không phân biệt hoa thường (Case-insensitive match)
    if (search) {
      const formattedSearch = `%${search}%`;
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('permission.code ILIKE :search', {
            search: formattedSearch,
          }).orWhere('permission.description ILIKE :search', {
            search: formattedSearch,
          });
        }),
      );
    }

    // 3. Thiết lập Sắp xếp đa tầng & Phân trang
    queryBuilder
      .orderBy('permission.module', 'ASC')
      .addOrderBy('permission.code', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    // 4. Kích hoạt truy vấn lấy danh sách và đếm tổng phần tử
    const [items, totalElements] = await queryBuilder.getManyAndCount();

    // 5. Định dạng dữ liệu đầu ra
    const formattedData = items.map((permission) => ({
      id: Number(permission.id), // Ép bigint về dạng number an toàn cho Frontend
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
        totalElements,
        totalPages: Math.ceil(totalElements / limit),
      },
    };
  }

  // GET /api/v1/permissions/modules
  async getModules(): Promise<any> {
    // 1. Bản đồ ánh xạ mã Module sang Tên hiển thị Tiếng Việt [2.3]
    const moduleDisplayMap: Record<string, string> = {
      MOVIE: 'Quản lý Danh mục Phim',
      SHOWTIME: 'Quản lý Lịch chiếu & Phòng chiếu',
      TICKET: 'Quản lý Bán vé & Soát vé',
      FINANCE: 'Quản lý Tài chính & Doanh thu',
      INVENTORY: 'Quản lý Kho & Combo F&B',
      USER: 'Quản lý Tài khoản người dùng',
      ROLE: 'Quản lý Vai trò & Phân quyền',
    };

    // 2. Xây dựng câu lệnh truy vấn Gom nhóm & Thống kê số lượng quyền [2.3]
    const rawResults = await this.permissionRepository
      .createQueryBuilder('permission')
      .select('permission.module', 'module')
      .addSelect('COUNT(permission.id)', 'totalPermissions')
      .groupBy('permission.module')
      .orderBy('permission.module', 'ASC')
      .getRawMany(); // Sử dụng getRawMany để lấy kết quả từ hàm COUNT của DB

    // 3. Thực hiện map dữ liệu bổ sung thuộc tính displayName thân thiện với UI [2.3]
    const formattedData = rawResults.map((row) => {
      const moduleCode = String(row.module).toUpperCase();
      return {
        module: moduleCode,
        displayName: moduleDisplayMap[moduleCode] || `Phân hệ ${moduleCode}`, // Fallback tên nếu module mới chưa khai báo trong từ điển
        totalPermissions: Number(row.totalPermissions), // Chuyển đổi chuỗi COUNT từ DB về dạng số nguyên
      };
    });

    return formattedData;
  }

  // GET /api/v1/permissions/:id
  async findById(id: number): Promise<any> {
    const permissionIdStr = String(id);

    // 1. Truy vấn chi tiết quyền kèm liên kết lồng nhau để lấy thông tin Vai trò
    const permission = await this.permissionRepository.findOne({
      where: { id: permissionIdStr },
      relations: {
        rolePermissions: {
          role: true, // Nạp thông tin Role cốt lõi
        },
      },
    });

    // 2. Kiểm tra tồn tại (PERMISSION_NOT_FOUND)
    if (!permission) {
      throw new NotFoundException({
        message: `Mã quyền hạn hệ thống với ID ${id} không tồn tại.`,
        errorCode: 'PERMISSION_NOT_FOUND',
      });
    }

    // 3. Phẳng hóa dữ liệu mảng vai trò gán kèm
    const formattedRoles = (permission.rolePermissions || [])
      .filter((rp) => rp.role) // Phòng vệ dữ liệu mồ côi
      .map((rp) => ({
        id: Number(rp.role.id),
        code: rp.role.code,
        name: rp.role.name,
      }));

    // 4. Định dạng cấu trúc trả về
    return {
      id: Number(permission.id),
      code: permission.code,
      module: permission.module,
      description: permission.description,
      assignedRoles: formattedRoles,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
    };
  }

  // POST /api/v1/permissions liên quan đến redis
  async create(dto: CreatePermissionDto): Promise<any> {
    const { code, name, module, description } = dto;

    // 1. Kiểm tra Trùng lặp mã quyền hệ thống
    const existingPermission = await this.permissionRepository.findOne({
      where: { code },
    });

    if (existingPermission) {
      throw new ConflictException({
        message: `Mã quyền hạn '${code}' đã tồn tại trong hệ thống và không thể khai báo trùng lặp.`,
        errorCode: 'PERMISSION_CODE_ALREADY_EXISTS',
      });
    }

    // 2. Thực thi khởi tạo thực thể và lưu vào cơ sở dữ liệu
    const permissionInstance = this.permissionRepository.create({
      code: code.trim(),
      name: name.trim(),
      module: module.trim(),
      description: description || null,
    });

    const savedPermission =
      await this.permissionRepository.save(permissionInstance);

    // 3. Cập nhật Permission Registry trong RAM/Redis để các Gateway bắt kịp cấu hình quyền [4.2]
    // await this.redisService.sadd('security:permission:registry', savedPermission.code);

    // 4. Định dạng Output
    return {
      id: Number(savedPermission.id), // Ép kiểu bigint sang number an toàn cho Frontend
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
    const permissionIdStr = String(id);

    // 1. Kiểm tra sự tồn tại của Quyền hạn
    const permission = await this.permissionRepository.findOne({
      where: { id: permissionIdStr },
    });
    if (!permission) {
      throw new NotFoundException({
        message:
          'Quyền thao tác yêu cầu chỉnh sửa không tồn tại trên hệ thống.',
        errorCode: 'PERMISSION_NOT_FOUND',
      });
    }

    // 2. Thực thi ghi đè các trường được phép (Tuyệt đối không nhận trường 'code')
    permission.name = dto.name.trim();
    permission.module = dto.module.trim();
    permission.description = dto.description ?? permission.description;

    const updatedPermission = await this.permissionRepository.save(permission);

    // 3. Định dạng cấu trúc đầu ra
    return {
      id: Number(updatedPermission.id),
      code: updatedPermission.code, // Trả về code cũ do tính chất bất biến
      module: updatedPermission.module,
      name: updatedPermission.name,
      description: updatedPermission.description,
      createdAt: updatedPermission.createdAt,
      updatedAt: updatedPermission.updatedAt,
    };
  }

  // DELETE /api/v1/permissions/:id liên quan đến redis
  async delete(id: number): Promise<any> {
    const permissionIdStr = String(id);

    // 1. Kiểm tra sự tồn tại của Quyền hạn (Existence Check) [6.2]
    const permission = await this.permissionRepository.findOne({
      where: { id: permissionIdStr },
    });
    if (!permission) {
      throw new NotFoundException({
        message: 'Quyền thao tác yêu cầu xóa không tồn tại trên hệ thống.',
        errorCode: 'PERMISSION_NOT_FOUND',
      });
    }

    // 2. Kiểm tra Liên kết Phân quyền (Role Attachment Integrity Check)
    // Sử dụng manager hoặc inject trực tiếp Repository của RolePermission để đếm số lượng Role đang gán quyền này
    const assignedRolesCount = await this.permissionRepository.manager.count(
      RolePermission,
      {
        where: { permission: { id: permissionIdStr } },
      },
    );

    // Nếu số lượng vai trò đang giữ quyền này lớn hơn 0 -> Chặn đứng hành động xóa
    if (assignedRolesCount > 0) {
      throw new ConflictException({
        message: `Không thể xóa quyền này vì đang được gán cho ${assignedRolesCount} vai trò trong hệ thống.`,
        errorCode: 'PERMISSION_IN_USE_BY_ROLES',
        // Định dạng cấu trúc errors chi tiết tương thích chính xác với Response Schema lỗi (6.3.b)
        errors: [
          {
            field: 'id',
            message:
              'Hãy gỡ quyền này khỏi các vai trò liên quan trước khi thực hiện xóa.',
          },
        ],
      } as any); // Ép kiểu as any để truyền mảng errors tùy biến qua Filter
    }

    // 3. Thực thi Xóa Dữ liệu từ Database (Khi assignedRolesCount == 0)
    await this.permissionRepository.delete(permissionIdStr);

    // 4. Cập nhật / Xóa thông tin Permission khỏi System Cache Registry [6.2]
    // await this.redisService.srem('security:permission:registry', permission.code);

    // 5. Trả về cấu trúc thành công khớp
    return {
      deletedPermissionId: Number(permissionIdStr),
    };
  }
}
