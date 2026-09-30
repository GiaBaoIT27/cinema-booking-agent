import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Cấu hình tập trung
import appConfig from './config/app.config.js';
import databaseConfig from './config/database.config.js';
import jwtConfig from './config/jwt.config.js';
import redisConfig from './config/redis.config.js';
import mailConfig from './config/mail.config.js';
import queueConfig from './config/queue.config.js';
import cloudinaryConfig from './config/cloudinary.config.js';
import { validateEnv } from './config/env.validation.js';

// Hạ tầng dùng chung: Redis, EventBus, Queue, Mailer, Storage, Logger — xem core/core.module.ts
import { CoreModule } from './core/core.module.js';

// Middleware + Guard toàn cục
import { HeaderValidationMiddleware } from './common/middleware/header-validation.middleware.js';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from './common/guards/permissions.guard.js';

// 4 trục nghiệp vụ — app.module.ts chỉ biết đến đây, không biết Users/Movies/Bookings... tồn tại
import { IdentityModule } from './modules/aggregators/identity.module.js';
import { CatalogModule } from './modules/aggregators/catalog.module.js';
import { CinemaCoreModule } from './modules/aggregators/cinema-core.module.js';
import { SalesModule } from './modules/aggregators/sales.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
      load: [
        appConfig,
        databaseConfig,
        jwtConfig,
        redisConfig,
        queueConfig,
        mailConfig,
        cloudinaryConfig,
      ],
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        autoLoadEntities: true,
        synchronize: config.get<boolean>('database.synchronize'),
      }),
    }),

    CoreModule,
    IdentityModule,
    CatalogModule,
    CinemaCoreModule,
    SalesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestContextMiddleware, HeaderValidationMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
