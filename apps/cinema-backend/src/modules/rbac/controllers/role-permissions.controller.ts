import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { RolePermissionsService } from '../services/role-permissions.service.js';
import { QueryRolePermissionsDto } from '../dto/role-permission/query-role-permissions.dto.js';
import { UpdateRolePermissionsDto } from '../dto/role-permission/update-role-permissions.dto.js';
import { AppendRolePermissionsDto } from '../dto/role-permission/append-role-permissions.dto.js';
import { JwtAuthGuard } from '#src/common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '#src/common/guards/permissions.guard.js';
import { RequirePermissions } from '#src/common/decorators/permissions.decorator.js';

@Controller('roles') // Tiền tố URL endpoint hệ thống bắt đầu bằng /roles
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolePermissionsController {
  constructor(
    private readonly rolePermissionsService: RolePermissionsService,
  ) {}

  // 1. GET /api/v1/roles/{roleId}/permissions - Tra cứu danh sách quyền gán của Vai trò
  @Get(':roleId/permissions')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('role:view')
  getRolePermissions(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Query() query: QueryRolePermissionsDto,
  ) {
    return this.rolePermissionsService.getRolePermissions(roleId, query);
  }

  // 2. PUT /api/v1/roles/{roleId}/permissions - Đồng bộ/Ghi đè hàng loạt ma trận quyền
  @Put(':roleId/permissions')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('role:update')
  updatePermissions(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.rolePermissionsService.updatePermissions(roleId, dto);
  }

  // 3. POST /api/v1/roles/{roleId}/permissions - Gán thêm một hoặc nhiều quyền mới (Cộng dồn)
  @Post(':roleId/permissions')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('role:update')
  appendPermissions(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Body() dto: AppendRolePermissionsDto,
  ) {
    return this.rolePermissionsService.appendPermissions(roleId, dto);
  }

  // 4. DELETE /api/v1/roles/{roleId}/permissions/{permissionId} - Thu hồi 1 quyền đơn lẻ
  @Delete(':roleId/permissions/:permissionId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('role:update')
  revokePermission(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Param('permissionId', ParseIntPipe) permissionId: number,
  ) {
    return this.rolePermissionsService.revokePermission(roleId, permissionId);
  }
}
