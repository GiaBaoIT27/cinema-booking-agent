import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DistributorsModule } from './modules/distributors/distributors.module.js';
import { MoviesModule } from './modules/movies/movies.module.js';
import { GenresModule } from './modules/genres/genres.module.js';
import { LocationsModule } from './modules/locations/locations.module.js';
import { RbacModule } from './modules/rbac/rbac.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: true, // Chỉ bật 'true' ở giai đoạn Dev ban đầu
      }),
    }),
    DistributorsModule,
    MoviesModule,
    GenresModule,
    LocationsModule,
    RbacModule,
  ],
})
export class AppModule {}
