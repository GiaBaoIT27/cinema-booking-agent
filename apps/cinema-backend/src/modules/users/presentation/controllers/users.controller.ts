import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { UsersService } from '../../application/services/users.service.js';
import { UpdateProfileDto } from '../../application/dto/update-profile.dto.js';
import { QueryUsersDto } from '../../application/dto/query-users.dto.js';
import { CreateInternalUserDto } from '../../application/dto/create-internal-user.dto.js';
import { AssignRoleDto } from '../../application/dto/assign-role.dto.js';
import { UpdateStatusDto } from '../../application/dto/update-status.dto.js';

import { JwtAuthGuard } from '#src/common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '#src/common/guards/permissions.guard.js';
import { RequirePermissions } from '#src/common/decorators/permissions.decorator.js';
import { CurrentUser } from '#src/common/decorators/current-user.decorator.js';

@Controller('/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // 1. GET /api/v1/users/me
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  getProfile(@CurrentUser('userId') userId: string) {
    return this.usersService.getProfile(userId);
  }

  // 2. PUT /api/v1/users/me
  @Put('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  // 3. GET /api/v1/users
  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('user:view')
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  // 4. POST /api/v1/users
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('user:create')
  createInternalUser(@Body() dto: CreateInternalUserDto) {
    return this.usersService.createInternalUser(dto);
  }

  // 5. GET /api/v1/users/{id}
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('user:view')
  findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  // 6. PUT /api/v1/users/{id}/role
  @Put(':id/role')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('user:assign_role')
  assignRole(
    @Param('id') id: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser() caller: any, // Lấy thông tin người gọi để check hierarchy constraint
  ) {
    return this.usersService.assignRole(id, dto, caller);
  }

  // 7. PATCH /api/v1/users/{id}/status
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('user:update_status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() caller: any, // Lấy thông tin tài khoản đang thực hiện lệnh
  ) {
    return this.usersService.updateStatus(id, dto, caller);
  }
}
