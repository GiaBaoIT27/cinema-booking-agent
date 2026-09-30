import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './domain/entities/role.entity.js';
import { Permission } from './domain/entities/permission.entity.js';
import { RolePermission } from './domain/entities/role-permission.entity.js';
import { UserRole } from './domain/entities/user-role.entity.js';
import { PERMISSION_REPOSITORY } from './domain/repositories/permission.repository.interface.js';
import { ROLE_REPOSITORY } from './domain/repositories/role.repository.interface.js';
import { USER_ROLE_REPOSITORY } from './domain/repositories/user-role.repository.interface.js';
import { TypeOrmPermissionRepository } from './infrastructure/persistence/typeorm-permission.repository.js';
import { TypeOrmRoleRepository } from './infrastructure/persistence/typeorm-role.repository.js';
import { TypeOrmUserRoleRepository } from './infrastructure/persistence/typeorm-user-role.repository.js';
import { RolesService } from './application/services/roles.service.js';
import { PermissionsService } from './application/services/permissions.service.js';
import { RolePermissionsService } from './application/services/role-permissions.service.js';
import { UserRolesService } from './application/services/user-roles.service.js';
import { PermissionCacheService } from './application/services/permission-cache.service.js';
import { OnRolePermissionsChangedHandler } from './application/event-handlers/on-role-permissions-changed.handler.js';
import { RolesController } from './presentation/controllers/roles.controller.js';
import { PermissionsController } from './presentation/controllers/permissions.controller.js';
import { RolePermissionsController } from './presentation/controllers/role-permissions.controller.js';
import { UserRolesController } from './presentation/controllers/user-roles.controller.js';
import { RbacFacade } from './public-api/rbac.facade.js';
import { PERMISSION_RESOLVER } from '#src/common/interfaces/permission-resolver.interface.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Role, Permission, RolePermission, UserRole]),
  ],
  controllers: [
    RolesController,
    PermissionsController,
    RolePermissionsController,
    UserRolesController,
  ],
  providers: [
    // Repositories (DIP)
    {
      provide: PERMISSION_REPOSITORY,
      useClass: TypeOrmPermissionRepository,
    },
    {
      provide: ROLE_REPOSITORY,
      useClass: TypeOrmRoleRepository,
    },
    {
      provide: USER_ROLE_REPOSITORY,
      useClass: TypeOrmUserRoleRepository,
    },

    // Services
    RolesService,
    PermissionsService,
    RolePermissionsService,
    UserRolesService,
    PermissionCacheService,
    OnRolePermissionsChangedHandler,

    // Public Facade & Inverted Dependency Token
    RbacFacade,
    {
      provide: PERMISSION_RESOLVER,
      useExisting: RbacFacade,
    },
  ],
  exports: [PERMISSION_RESOLVER, RbacFacade],
})
export class RbacModule {}
