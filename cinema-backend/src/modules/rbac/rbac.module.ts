import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity.js';
import { Permission } from './entities/permission.entity.js';
import { RolePermission } from './entities/role-permission.entity.js';
import { UserRole } from './entities/user-role.entity.js';
import { User } from '../users/entities/user.entity.js';
import { Cineplex } from '../cinemas/entities/cineplex.entity.js';
import { RolesService } from './services/roles.service.js';
import { RolesController } from './controllers/roles.controller.js';
import { PermissionsService } from './services/permissions.service.js';
import { PermissionsController } from './controllers/permissions.controller.js';
import { RolePermissionsService } from './services/role-permissions.service.js';
import { RolePermissionsController } from './controllers/role-permissions.controller.js';
import { UserRolesService } from './services/user-roles.service.js';
import { UserRolesController } from './controllers/user-roles.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Role,
      Permission,
      RolePermission,
      UserRole,
      User,
      Cineplex,
    ]),
  ],
  controllers: [
    RolesController,
    PermissionsController,
    RolePermissionsController,
    UserRolesController,
  ],
  providers: [
    RolesService,
    PermissionsService,
    RolePermissionsService,
    UserRolesService,
  ],
  exports: [
    RolesService,
    PermissionsService,
    RolePermissionsService,
    UserRolesService,
    TypeOrmModule,
  ],
})
export class RbacModule {}
