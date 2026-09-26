import { DataSource } from 'typeorm';
import { Role } from '#modules/rbac/entities/role.entity.js';
import { Permission } from '#modules/rbac/entities/permission.entity.js';
import { RolePermission } from '#modules/rbac/entities/role-permission.entity.js';
import { RoleCode } from '#modules/rbac/enums/role.enum.js';

export class RolePermissionSeeder {
  async run(dataSource: DataSource): Promise<void> {
    const roleRepository = dataSource.getRepository(Role);
    const permissionRepository = dataSource.getRepository(Permission);
    const rolePermissionRepository = dataSource.getRepository(RolePermission);

    // 1. Định nghĩa Ma trận Phân quyền (Mapping giữa Permission Code và các RoleCode được cấp)
    const rolePermissionMapping: Record<string, string[]> = {
      // SYSTEM & CINEMA & SEAT TYPE
      'province:create': [RoleCode.SUPER_ADMIN],
      'ward:create': [RoleCode.SUPER_ADMIN],
      'cinema:manage': [RoleCode.SUPER_ADMIN],
      'auditorium:view': [RoleCode.SUPER_ADMIN, RoleCode.CINEMA_MANAGER],
      'auditorium:create': [RoleCode.SUPER_ADMIN],
      'auditorium:update': [RoleCode.SUPER_ADMIN],
      'seat_type:create': [RoleCode.SUPER_ADMIN],
      'seat_type:update': [RoleCode.SUPER_ADMIN],
      'seat_type:delete': [RoleCode.SUPER_ADMIN],

      // MOVIE & GENRE
      'movie:view': [
        RoleCode.SUPER_ADMIN,
        RoleCode.CINEMA_MANAGER,
        RoleCode.CINEMA_STAFF,
      ],
      'movie:create': [RoleCode.SUPER_ADMIN],
      'movie:update': [RoleCode.SUPER_ADMIN],
      'movie:delete': [RoleCode.SUPER_ADMIN],
      'genre:create': [RoleCode.SUPER_ADMIN],
      'genre:update': [RoleCode.SUPER_ADMIN],
      'genre:delete': [RoleCode.SUPER_ADMIN],

      // DISTRIBUTOR & SETTLEMENT
      'distributor:view': [RoleCode.SUPER_ADMIN, RoleCode.CINEMA_MANAGER],
      'distributor:create': [RoleCode.SUPER_ADMIN],
      'distributor:update': [RoleCode.SUPER_ADMIN],
      'settlement:view': [RoleCode.SUPER_ADMIN, RoleCode.CINEMA_MANAGER],
      'settlement:generate': [RoleCode.SUPER_ADMIN], // Chưa gán vai trò trong mô tả
      'settlement:approve': [RoleCode.SUPER_ADMIN],
      'settlement:export': [RoleCode.SUPER_ADMIN],

      // SHOWTIME & PRICE_RULE & SEAT_PRICE
      'showtime:create': [RoleCode.SUPER_ADMIN, RoleCode.CINEMA_MANAGER],
      'showtime:update': [RoleCode.SUPER_ADMIN, RoleCode.CINEMA_MANAGER],
      'showtime_seat:manage': [RoleCode.SUPER_ADMIN, RoleCode.CINEMA_MANAGER],
      'price_rule:view': [RoleCode.SUPER_ADMIN, RoleCode.CINEMA_MANAGER],
      'price_rule:create': [RoleCode.SUPER_ADMIN],
      'price_rule:update': [RoleCode.SUPER_ADMIN],
      'price_rule:delete': [RoleCode.SUPER_ADMIN],
      'seat_price:generate': [RoleCode.SUPER_ADMIN, RoleCode.CINEMA_MANAGER],
      'seat_price:override': [RoleCode.SUPER_ADMIN, RoleCode.CINEMA_MANAGER],

      // FNB & INVENTORY
      'fnb:create': [RoleCode.SUPER_ADMIN],
      'fnb:update': [RoleCode.SUPER_ADMIN],
      'fnb:fulfill': [RoleCode.CINEMA_MANAGER, RoleCode.CINEMA_STAFF],
      'inventory:view': [
        RoleCode.SUPER_ADMIN,
        RoleCode.CINEMA_MANAGER,
        RoleCode.CINEMA_STAFF,
      ],
      'inventory:manage': [RoleCode.CINEMA_MANAGER, RoleCode.CINEMA_STAFF],
      'inventory:adjust': [RoleCode.CINEMA_MANAGER, RoleCode.CINEMA_STAFF],

      // ORDER & TICKET & PAYMENT
      'order:create': [
        RoleCode.CINEMA_STAFF,
        RoleCode.CUSTOMER,
        RoleCode.AI_AGENT,
      ],
      'order:view': [
        RoleCode.SUPER_ADMIN,
        RoleCode.CINEMA_MANAGER,
        RoleCode.CINEMA_STAFF,
        RoleCode.CUSTOMER,
      ],
      'order:cancel': [
        RoleCode.SUPER_ADMIN,
        RoleCode.CINEMA_MANAGER,
        RoleCode.CUSTOMER,
      ],
      'order:manage': [RoleCode.SUPER_ADMIN, RoleCode.CINEMA_MANAGER],
      'ticket:view': [
        RoleCode.SUPER_ADMIN,
        RoleCode.CINEMA_MANAGER,
        RoleCode.CINEMA_STAFF,
        RoleCode.CUSTOMER,
        RoleCode.AI_AGENT,
      ],
      'ticket:checkin': [RoleCode.CINEMA_STAFF],
      'ticket:cancel': [RoleCode.SUPER_ADMIN, RoleCode.CINEMA_MANAGER],
      'payment:view': [
        RoleCode.SUPER_ADMIN,
        RoleCode.CINEMA_MANAGER,
        RoleCode.CUSTOMER,
      ],
      'payment:reconcile': [RoleCode.SUPER_ADMIN],
      'payment:manage': [RoleCode.SUPER_ADMIN],
      'payment:refund': [RoleCode.SUPER_ADMIN, RoleCode.CINEMA_MANAGER],

      // PROMOTION & VOUCHER & POINT
      'promo:view': [
        RoleCode.SUPER_ADMIN,
        RoleCode.CINEMA_MANAGER,
        RoleCode.CINEMA_STAFF,
      ],
      'promo:create': [RoleCode.SUPER_ADMIN],
      'promo:update': [RoleCode.SUPER_ADMIN],
      'promo:apply': [
        RoleCode.SUPER_ADMIN,
        RoleCode.CINEMA_MANAGER,
        RoleCode.CINEMA_STAFF,
        RoleCode.CUSTOMER,
        RoleCode.AI_AGENT,
      ],
      'voucher:grant': [RoleCode.SUPER_ADMIN, RoleCode.CINEMA_MANAGER],
      'voucher:view': [
        RoleCode.SUPER_ADMIN,
        RoleCode.CINEMA_MANAGER,
        RoleCode.CUSTOMER,
      ],
      'voucher:manage': [RoleCode.SUPER_ADMIN],
      'point:view': [
        RoleCode.SUPER_ADMIN,
        RoleCode.CINEMA_MANAGER,
        RoleCode.CUSTOMER,
      ],
      'point:adjust': [RoleCode.SUPER_ADMIN, RoleCode.CINEMA_MANAGER],

      // ROLE & PERMISSION & USER
      'role:view': [RoleCode.SUPER_ADMIN],
      'role:create': [RoleCode.SUPER_ADMIN],
      'role:update': [RoleCode.SUPER_ADMIN],
      'role:delete': [RoleCode.SUPER_ADMIN],
      'permission:view': [RoleCode.SUPER_ADMIN],
      'permission:manage': [RoleCode.SUPER_ADMIN],
      'user:view': [RoleCode.SUPER_ADMIN, RoleCode.CINEMA_MANAGER],
      'user:create': [RoleCode.SUPER_ADMIN, RoleCode.CINEMA_MANAGER],
      'user:assign_role': [RoleCode.SUPER_ADMIN, RoleCode.CINEMA_MANAGER],
      'user:update_status': [RoleCode.SUPER_ADMIN, RoleCode.CINEMA_MANAGER],

      // REVIEW
      'review:moderate': [RoleCode.SUPER_ADMIN, RoleCode.CINEMA_MANAGER],
      'review:delete': [
        RoleCode.SUPER_ADMIN,
        RoleCode.CINEMA_MANAGER,
        RoleCode.CUSTOMER,
      ],

      // REPORT & ANALYTICS
      'report:global': [RoleCode.SUPER_ADMIN],
      analytics: [RoleCode.SUPER_ADMIN, RoleCode.CINEMA_MANAGER],
      'analytics:export': [RoleCode.SUPER_ADMIN, RoleCode.CINEMA_MANAGER],
      'analytics:etl_manage': [RoleCode.SUPER_ADMIN],
    };

    console.log(
      'Khởi chạy quy trình Seeding phân quyền (Role - Permissions)...',
    );

    // 2. Lấy toàn bộ danh sách Roles và Permissions hiện có trong Database để ánh xạ theo ID
    const roles = await roleRepository.find();
    const permissions = await permissionRepository.find();

    const roleMap = new Map<string, Role>(roles.map((r) => [r.code, r]));
    const permissionMap = new Map<string, Permission>(
      permissions.map((p) => [p.code, p]),
    );

    let assignedCount = 0;

    // 3. Thực thi gán quyền theo tính lũy đẳng (Idempotent execution)
    for (const [permCode, allowedRoleCodes] of Object.entries(
      rolePermissionMapping,
    )) {
      const permission = permissionMap.get(permCode);

      if (!permission) {
        console.warn(
          `[Cảnh báo] Không tìm thấy Permission trong DB với code: ${permCode}`,
        );
        continue;
      }

      for (const roleCode of allowedRoleCodes) {
        const role = roleMap.get(roleCode);

        if (!role) {
          console.warn(
            `[Cảnh báo] Không tìm thấy Role trong DB với code: ${roleCode}`,
          );
          continue;
        }

        // Kiểm tra xem liên kết Role - Permission này đã tồn tại chưa
        const existingMapping = await rolePermissionRepository.findOne({
          where: {
            role: { id: role.id },
            permission: { id: permission.id },
          },
        });

        if (!existingMapping) {
          const newRolePermission = rolePermissionRepository.create({
            role,
            permission,
          });
          await rolePermissionRepository.save(newRolePermission);
          assignedCount++;
        }
      }
    }

    console.log(
      `Hoàn thành Seeding bảng Role_Permissions! Đã khởi tạo mới/kiểm tra ${assignedCount} liên kết quyền.`,
    );
  }
}
