import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '#src/core/redis/redis.module.js';
import { StorageModule } from '#src/core/storage/storage.module.js';
import { DistributorsModule } from '#modules/distributors/distributors.module.js';
import { GenresModule } from '#modules/genres/genres.module.js';

// Domain
import { Movie } from './domain/entities/movie.entity.js';
import { MOVIE_REPOSITORY } from './domain/repositories/movie.repository.interface.js';
import { SHOWTIME_GATEWAY } from './domain/ports/showtime.gateway.port.js';

// Infrastructure
import { TypeOrmMovieRepository } from './infrastructure/persistence/typeorm-movie.repository.js';
import { SqlShowtimeGatewayAdapter } from './infrastructure/adapters/sql-showtime.gateway.adapter.js';

// Application
import { MoviesService } from './application/services/movies.service.js';
import { MovieMediaService } from './application/services/movie-media.service.js';
import { MoviesCacheService } from './application/services/movies-cache.service.js';

// Presentation
import { MoviesController } from './presentation/controllers/movies.controller.js';

// Public API
import { MoviesFacade } from './public-api/movies.facade.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Movie]),
    RedisModule,
    // Module khác chỉ được dùng qua Facade mà chúng export
    StorageModule,
    DistributorsModule,
    GenresModule,
  ],
  controllers: [MoviesController],
  providers: [
    // Repository (DIP)
    { provide: MOVIE_REPOSITORY, useClass: TypeOrmMovieRepository },

    // Port tới module showtimes (adapter là nơi DUY NHẤT được chạm dữ liệu module khác)
    { provide: SHOWTIME_GATEWAY, useClass: SqlShowtimeGatewayAdapter },

    // Services
    MoviesService,
    MovieMediaService,
    MoviesCacheService,

    // Public Facade
    MoviesFacade,
  ],
  // Chỉ Facade được phép ra ngoài — không export service/repository nội bộ.
  exports: [MoviesFacade],
})
export class MoviesModule {}
