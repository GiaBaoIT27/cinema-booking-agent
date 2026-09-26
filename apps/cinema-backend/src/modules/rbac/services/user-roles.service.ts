import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { UserRole } from '../entities/user-role.entity.js'; // Đường dẫn tới thực thể UserRole
import { AssignUserRoleDto } from '../dto/user-role/assign-user-role.dto.js';
import { Role } from '../entities/role.entity.js';
import { Cineplex } from '../../cinemas/entities/cineplex.entity.js';
import { SyncUserRolesDto } from '../dto/user-role/sync-user-roles.dto.js';

@Injectable()
export class UserRolesService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Cineplex)
    private readonly cineplexRepository: Repository<Cineplex>,
    private readonly dataSource: DataSource,
  ) {}

  // GET /api/v1/users/:userId/roles
  async getUserRoles(userId: number): Promise<any> {
    const userIdStr = String(userId);

    // 1. Kiểm tra tồn tại tài khoản người dùng (USER_NOT_FOUND) [1.2]
    const user = await this.userRepository.findOne({
      where: { id: userIdStr },
      select: { id: true, fullName: true }, // Cú pháp chuẩn TypeORM v3 chống lỗi compile select
    });

    if (!user) {
      throw new NotFoundException({
        message: `Tài khoản người dùng với mã ID ${userId} không tồn tại trên hệ thống.`,
        errorCode: 'USER_NOT_FOUND',
      });
    }

    // 2. Truy vấn danh sách phân quyền kèm thông tin quan hệ lồng nhau
    const userRoles = await this.userRoleRepository.find({
      where: { userId: userIdStr },
      relations: {
        role: true,
        cineplex: true,
      },
      order: { id: 'DESC' }, // Sắp xếp giảm dần
    });

    // 3. Phẳng hóa dữ liệu và bóc tách cấu trúc phân vùng Scope (GLOBAL hoặc CINEPLEX_RESTRICTED)
    const assignedRoles = userRoles.map((ur) => {
      // Xác định Scope dựa trên sự tồn tại của cineplexId
      const isGlobal = !ur.cineplexId;

      return {
        assignmentId: Number(ur.id),
        roleId: ur.role ? Number(ur.role.id) : null,
        roleCode: ur.role ? ur.role.code : 'UNKNOWN',
        roleName: ur.role ? ur.role.name : 'Chưa xác định',
        scope: isGlobal
          ? { type: 'GLOBAL' } // Phạm vi toàn hệ thống
          : {
              type: 'CINEPLEX_RESTRICTED', // Phạm vi cụm rạp giới hạn
              cineplexId: Number(ur.cineplexId),
              cineplexName: ur.cineplex
                ? ur.cineplex.name
                : 'Rạp chưa xác định',
            },
        assignedAt: ur.createdAt,
      };
    });

    // 4. Trả về đúng cấu trúc gói Payload thành công theo Response Schema
    return {
      userId: Number(user.id),
      userFullName: user.fullName,
      assignedRoles,
    };
  }

  // POST /api/v1/users/:userId/roles liên quan đến Redis
  async assignRole(userId: number, dto: AssignUserRoleDto): Promise<any> {
    const { roleId, cineplexId } = dto;
    const userIdStr = String(userId);
    const roleIdStr = String(roleId);
    const cineplexIdStr = cineplexId ? String(cineplexId) : null;

    // 1. Xác thực Ràng buộc Khóa Ngoại (Foreign Key Validation) [2.2]
    const userExists = await this.userRepository.findOne({
      where: { id: userIdStr },
      select: { id: true },
    });
    if (!userExists) {
      throw new NotFoundException({
        message: 'Tài khoản người dùng không tồn tại.',
        errorCode: 'USER_NOT_FOUND',
      });
    }

    const role = await this.roleRepository.findOne({
      where: { id: roleIdStr },
      select: { id: true, code: true },
    });
    if (!role) {
      throw new NotFoundException({
        message: 'Vai trò phân quyền không tồn tại.',
        errorCode: 'ROLE_NOT_FOUND',
      });
    }

    if (cineplexIdStr) {
      const cineplexExists = await this.cineplexRepository.findOne({
        where: { id: cineplexIdStr },
        select: { id: true },
      });
      if (!cineplexExists) {
        throw new NotFoundException({
          message: 'Cụm rạp chiếu phim không tồn tại.',
          errorCode: 'CINEPLEX_NOT_FOUND',
        });
      }
    }

    // 2. Tránh Trùng Lặp bộ ba nghiêm ngặt (Xử lý thông minh điều kiện NULL của Postgres) [2.2]
    const queryBuilder = this.userRoleRepository
      .createQueryBuilder('ur')
      .where('ur.user_id = :userId', { userId: userIdStr })
      .andWhere('ur.role_id = :roleId', { roleId: roleIdStr });

    if (cineplexIdStr) {
      queryBuilder.andWhere('ur.cineplex_id = :cineplexId', {
        cineplexId: cineplexIdStr,
      });
    } else {
      queryBuilder.andWhere('ur.cineplex_id IS NULL');
    }

    const isDuplicate = await queryBuilder.getCount();
    if (isDuplicate > 0) {
      throw new ConflictException({
        message:
          'This role with the specified cineplex scope is already assigned to the user',
        errorCode: 'USER_ROLE_SCOPE_ALREADY_EXISTS',
      });
    }

    // 3. Thực thi Thêm mới bản ghi [2.2]
    const userRoleInstance = this.userRoleRepository.create({
      userId: userIdStr,
      roleId: roleIdStr,
      cineplexId: cineplexIdStr,
    });

    const savedRecord = await this.userRoleRepository.save(userRoleInstance);

    // Vô hiệu hóa Session/Cache trên hạ tầng Redis [2.2]
    // await this.redisService.del(`auth:user:permissions:${userIdStr}`);

    // 4. Định dạng Output khớp chính xác 100% với Response Schema (2.3)
    return {
      id: Number(savedRecord.id),
      userId: Number(savedRecord.userId),
      roleId: Number(savedRecord.roleId),
      roleCode: role.code,
      cineplexId: savedRecord.cineplexId
        ? Number(savedRecord.cineplexId)
        : null,
      scopeType: savedRecord.cineplexId ? 'CINEPLEX_RESTRICTED' : 'GLOBAL',
      createdAt: savedRecord.createdAt,
    };
  }

  // POST /api/v1/users/:userId/roles/sync liên quan đến Redis
  async syncRoles(userId: number, dto: SyncUserRolesDto): Promise<any> {
    const { roles = [] } = dto;
    const userIdStr = String(userId);

    // 1. Xác thực User tồn tại (Cú pháp chuẩn TypeORM v3) [3.2]
    const userExists = await this.userRepository.findOne({
      where: { id: userIdStr },
      select: { id: true },
    });
    if (!userExists) {
      throw new NotFoundException({
        message: 'Tài khoản người dùng tra cứu không tồn tại.',
        errorCode: 'USER_NOT_FOUND',
      });
    }

    // 2. Atomic Validation: Xác thực toàn bộ danh sách Khóa Ngoại đầu vào [3.2]
    if (roles.length > 0) {
      const uniqueRoleIds = [...new Set(roles.map((r) => String(r.roleId)))];
      const uniqueCineplexIds = [
        ...new Set(
          roles.filter((r) => r.cineplexId).map((r) => String(r.cineplexId)),
        ),
      ];

      // Kích hoạt truy vấn song song (Parallel Query) để tối ưu hóa hiệu năng
      const [dbRolesCount, dbCineplexesCount] = await Promise.all([
        this.roleRepository.count({ where: { id: In(uniqueRoleIds) } }),
        uniqueCineplexIds.length > 0
          ? this.cineplexRepository.count({
              where: { id: In(uniqueCineplexIds) },
            })
          : Promise.resolve(0),
      ]);

      if (
        dbRolesCount !== uniqueRoleIds.length ||
        dbCineplexesCount !== uniqueCineplexIds.length
      ) {
        throw new NotFoundException({
          message: 'Danh sách đồng bộ chứa vai trò hoặc cụm rạp không hợp lệ.',
          errorCode: 'ONE_OR_MORE_PERMISSIONS_NOT_FOUND', // Khớp mã lỗi theo logic 3.2 của bạn
        });
      }
    }

    // Khởi động Database Transaction [3.2]
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Step 1: Xóa toàn bộ các bản ghi gán quyền cũ của User [3.2]
      await queryRunner.manager.delete(UserRole, { userId: userIdStr });

      let insertedRecords: UserRole[] = [];

      // Step 2: Thêm hàng loạt (Bulk Insert) danh sách vai trò mới [3.2]
      if (roles.length > 0) {
        const userRoleInstances = roles.map((r) =>
          queryRunner.manager.create(UserRole, {
            userId: userIdStr,
            roleId: String(r.roleId),
            cineplexId: r.cineplexId ? String(r.cineplexId) : null,
          }),
        );
        insertedRecords = await queryRunner.manager.save(
          UserRole,
          userRoleInstances,
        );
      }

      // Commit toàn bộ thay đổi an toàn vào DB
      await queryRunner.commitTransaction();

      // Vô hiệu hóa Active JWT / Session qua Redis Blacklist [3.2]
      // await this.redisService.set(`auth:blacklist:user:${userIdStr}`, 'revoked', 'EX', 7 * 24 * 60 * 60);

      // 3. Tái truy vấn thông tin Role Code để làm giàu dữ liệu (Enrichment) phục vụ Response Schema
      const roleMapping = await this.roleRepository.find({
        where: { id: In(roles.map((r) => String(r.roleId))) },
        select: { id: true, code: true },
      });
      const roleCodeMap = new Map(roleMapping.map((r) => [r.id, r.code]));

      const assignedRoles = insertedRecords.map((rec) => ({
        assignmentId: Number(rec.id),
        roleId: Number(rec.roleId),
        roleCode: roleCodeMap.get(rec.roleId) || 'UNKNOWN',
        cineplexId: rec.cineplexId ? Number(rec.cineplexId) : null,
      }));

      // 4. Trả về cấu trúc chính xác theo Response Schema (3.3)
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

  // DELETE /api/v1/users/:userId/roles/:id liên quan đến Redis
  async revokeRoleAssignment(id: number): Promise<any> {
    const assignmentIdStr = String(id);

    // 1. Truy vấn Tìm Bản ghi để lấy thông tin tài khoản bị ảnh hưởng [4.2]
    const userRole = await this.userRoleRepository.findOne({
      where: { id: assignmentIdStr },
      select: {
        id: true,
        userId: true,
        roleId: true,
        cineplexId: true,
      },
    });

    // 2. Kiểm tra tính tồn tại của bản ghi
    if (!userRole) {
      throw new NotFoundException({
        message:
          'Bản ghi gán vai trò và phạm vi cụm rạp không tồn tại hoặc đã bị thu hồi trước đó.',
        errorCode: 'ROLE_ASSIGNMENT_NOT_FOUND',
      });
    }

    // 3. Thực thi Xóa bản ghi khỏi cơ sở dữ liệu [4.2]
    await this.userRoleRepository.delete(assignmentIdStr);

    // 4. Vô hiệu hóa Session/Cache phân quyền của user_id đó trên Redis [4.2]
    // await this.redisService.del(`auth:user:permissions:${userRole.userId}`);

    // 5. Định dạng dữ liệu phản hồi khớp chính xác 100% với Response Schema (4.3)
    return {
      deletedAssignmentId: Number(userRole.id),
      affectedUserId: Number(userRole.userId),
    };
  }
}
