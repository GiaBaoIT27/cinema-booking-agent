import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Body,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
  Put,
  Delete,
} from '@nestjs/common';
import { RolesService } from '../services/roles.service.js';
import { QueryRolesDto } from '../dto/role/query-roles.dto.js';
import { JwtAuthGuard } from '#src/common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '#src/common/guards/permissions.guard.js';
import { RequirePermissions } from '#src/common/decorators/permissions.decorator.js';
import { CreateRoleDto } from '../dto/role/create-role.dto.js';
import { UpdateRoleDto } from '../dto/role/update-role.dto.js';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // 1. GET /api/v1/roles
  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('role:view') // Bắt buộc phải có quyền xem danh sách vai trò
  findAll(@Query() query: QueryRolesDto) {
    return this.rolesService.findAll(query);
  }

  // 2. GET /api/v1/roles/:id
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('role:view') // Bắt buộc phải có quyền xem chi tiết vai trò
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.findById(id);
  }

  // 3. POST /api/v1/roles
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('role:create') // Bắt buộc tài khoản thao tác phải có quyền khởi tạo
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  // 4. PUT /api/v1/roles/{id}
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('role:update') // Yêu cầu mã quyền cập nhật vai trò
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  // 5. DELETE /api/v1/roles/{id}
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('role:delete') // Yêu cầu mã quyền xóa vai trò
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.delete(id);
  }
}
