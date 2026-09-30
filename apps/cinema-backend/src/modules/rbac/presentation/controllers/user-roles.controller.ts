import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Body,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  Put,
  Delete,
} from '@nestjs/common';
import { UserRolesService } from '../../application/services/user-roles.service.js';
import { JwtAuthGuard } from '#src/common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '#src/common/guards/permissions.guard.js';
import { RequirePermissions } from '#src/common/decorators/permissions.decorator.js';
import { AssignUserRoleDto } from '../../application/dto/assign-user-role.dto.js';
import { SyncUserRolesDto } from '../../application/dto/sync-user-roles.dto.js';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UserRolesController {
  constructor(private readonly userRolesService: UserRolesService) {}

  // 1. GET /api/v1/users/{user_id}/roles
  @Get(':id/roles')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('user:view')
  getUserRoles(@Param('id', ParseIntPipe) id: number) {
    return this.userRolesService.getUserRoles(id);
  }

  // 2. POST /api/v1/users/{user_id}/roles
  @Post(':userId/roles')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('user:assign_role')
  assignRole(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: AssignUserRoleDto,
  ) {
    return this.userRolesService.assignRole(userId, dto);
  }

  // 3. PUT /api/v1/users/{user_id}/roles
  @Put(':userId/roles')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('user:assign_role')
  syncRoles(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: SyncUserRolesDto,
  ) {
    return this.userRolesService.syncRoles(userId, dto);
  }

  // 4. DELETE /api/v1/user-roles/{id}
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('user:assign_role')
  revokeRoleAssignment(@Param('id', ParseIntPipe) id: number) {
    return this.userRolesService.revokeRoleAssignment(id);
  }
}
