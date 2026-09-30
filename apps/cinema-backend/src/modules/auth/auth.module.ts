import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';

import { AuthService } from './application/services/auth.service.js';
import { AuthController } from './presentation/controllers/auth.controller.js';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy.js';
import { RedisModule } from '#src/core/redis/redis.module.js';
import { TokenRevocationService } from './application/services/token-revocation.service.js';
import { OnUserBlockedHandler } from './application/event/on-user-blocked.handler.js';

import { UsersModule } from '../users/users.module.js';
import { RbacModule } from '../rbac/rbac.module.js';

@Module({
  imports: [
    UsersModule,
    RbacModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    ConfigModule,
    RedisModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    TokenRevocationService,
    OnUserBlockedHandler,
  ],
  exports: [PassportModule, JwtStrategy, AuthService],
})
export class AuthModule {}
