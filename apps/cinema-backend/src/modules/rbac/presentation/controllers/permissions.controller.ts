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
import { PermissionsService } from '../../application/services/permissions.service.js';
import { QueryPermissionsDto } from '../../application/dto/query-permissions.dto.js';
import { JwtAuthGuard } from '#src/common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '#src/common/guards/permissions.guard.js';
import { RequirePermissions } from '#src/common/decorators/permissions.decorator.js';
import { CreatePermissionDto } from '../../application/dto/create-permission.dto.js';
import { UpdatePermissionDto } from '../../application/dto/update-permission.dto.js';

@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  // 2. GET /api/v1/permissions/modules
  @Get('modules')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('permission:view') // Khóa màng lọc quyền hạn tra cứu
  getModules() {
    return this.permissionsService.getModules();
  }

  // 3. GET /api/v1/permissions/{id}
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('permission:view') // Khóa màng lọc quyền hạn tra cứu
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.permissionsService.findById(id);
  }

  // 1. GET /api/v1/permissions
  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('permission:view') // Khóa màng lọc quyền hạn tra cứu
  findAll(@Query() query: QueryPermissionsDto) {
    return this.permissionsService.findAll(query);
  }

  // 4. POST /api/v1/permissions
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('permission:manage') // Khóa màng lọc quyền hạn khởi tạo quản trị
  create(@Body() dto: CreatePermissionDto) {
    return this.permissionsService.create(dto);
  }

  // 5. PUT /api/v1/permissions/{id}
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('permission:manage') // Khóa màng lọc mã quyền hạn quản trị
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePermissionDto,
  ) {
    return this.permissionsService.update(id, dto);
  }

  // 6. DELETE /api/v1/permissions/{id}
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('permission:manage') // Khóa màng lọc quyền hạn quản trị [6.1]
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.permissionsService.delete(id);
  }
}
