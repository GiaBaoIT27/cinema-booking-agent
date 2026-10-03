import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '#src/core/redis/redis.module.js';

// Domain
import { Genre } from './domain/entities/genre.entity.js';
import { GENRE_REPOSITORY } from './domain/repositories/genre.repository.interface.js';
import { MOVIE_CATALOG_GATEWAY } from './domain/ports/movie-catalog.gateway.port.js';

// Infrastructure
import { TypeOrmGenreRepository } from './infrastructure/persistence/typeorm-genre.repository.js';
import { SqlMovieCatalogGatewayAdapter } from './infrastructure/adapters/sql-movie-catalog.gateway.adapter.js';

// Application
import { GenresService } from './application/services/genres.service.js';
import { GenresCacheService } from './application/services/genres-cache.service.js';

// Presentation
import { GenresController } from './presentation/controllers/genres.controller.js';

// Public API
import { GenresFacade } from './public-api/genres.facade.js';

@Module({
  imports: [TypeOrmModule.forFeature([Genre]), RedisModule],
  controllers: [GenresController],
  providers: [
    // Repository (DIP)
    { provide: GENRE_REPOSITORY, useClass: TypeOrmGenreRepository },

    // Port tới module movies (adapter là nơi DUY NHẤT được chạm dữ liệu module khác)
    { provide: MOVIE_CATALOG_GATEWAY, useClass: SqlMovieCatalogGatewayAdapter },

    // Services
    GenresService,
    GenresCacheService,

    // Public Facade
    GenresFacade,
  ],
  // Chỉ Facade được phép ra ngoài — không export service/repository nội bộ.
  exports: [GenresFacade],
})
export class GenresModule {}
