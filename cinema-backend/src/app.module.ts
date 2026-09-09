import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';

// Import các Module chính của ứng dụng
import { AuthModule } from './modules/auth/auth.module.js';
import { DistributorsModule } from './modules/distributors/distributors.module.js';
import { MoviesModule } from './modules/movies/movies.module.js';
import { GenresModule } from './modules/genres/genres.module.js';
import { LocationsModule } from './modules/locations/locations.module.js';
import { RbacModule } from './modules/rbac/rbac.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { CinemasModule } from './modules/cinemas/cinemas.module.js';

// Import cấu hình tập trung
import { validateEnv } from './common/config/env.validation.js';
import appConfig from './config/app.config.js';
import databaseConfig from './config/database.config.js';
import jwtConfig from './config/jwt.config.js';
import redisConfig from './config/redis.config.js';

// Import Middleware và Guards
import { HeaderValidationMiddleware } from './common/middleware/header-validation.middleware.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from './common/guards/permissions.guard.js';
import { PromotionsModule } from './modules/promotions/promotions.module.js';
import { FnbModule } from './modules/fnb/fnb.module.js';
import { UploadModule } from './modules/upload/upload.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
      load: [appConfig, databaseConfig, jwtConfig, redisConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        autoLoadEntities: true,
        synchronize: configService.get<boolean>('database.synchronize'),
      }),
    }),
    AuthModule,
    RbacModule,
    UsersModule,
    CinemasModule,
    DistributorsModule,
    MoviesModule,
    GenresModule,
    LocationsModule,
    PromotionsModule,
    FnbModule,
    UploadModule,
  ],
  providers: [
    // 1. Kích hoạt JwtAuthGuard chạy toàn cục (Global Guard) trước tiên
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // 2. Kích hoạt PermissionsGuard chạy toàn cục ngay sau khi đã xác thực xong User
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule implements NestModule {
  // 3. Cấu hình Middleware kiểm tra Accept Header cho mọi Request đi vào hệ thống
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(HeaderValidationMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
