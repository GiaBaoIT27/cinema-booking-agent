import { Module } from '@nestjs/common';
import { DistributorsModule } from '../distributors/distributors.module.js';
import { GenresModule } from '../genres/genres.module.js';
import { MoviesModule } from '../movies/movies.module.js';

/**
 * Trục Catalog: Movies, Genres, Distributors.
 * Genres và Distributors độc lập với nhau; Movies phụ thuộc cả hai qua facade.
 * KHÔNG export lại module con (xem giải thích chi tiết ở identity.module.ts).
 */
@Module({
  imports: [GenresModule, DistributorsModule, MoviesModule],
})
export class CatalogModule {}
