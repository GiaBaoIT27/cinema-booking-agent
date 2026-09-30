import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from './domain/entities/user.entity.js';
import { TypeOrmUserRepository } from './infrastructure/persistence/typeorm-user.repository.js';
import { USER_REPOSITORY } from './domain/repositories/user.repository.interface.js';

import { UsersController } from './presentation/controllers/users.controller.js';
import { UsersService } from './application/services/users.service.js';
import { UsersFacade } from './public-api/users.facade.js';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: TypeOrmUserRepository,
    },
    UsersService,
    UsersFacade,
  ],
  exports: [UsersFacade], // Only export facade for other modules
})
export class UsersModule {}
