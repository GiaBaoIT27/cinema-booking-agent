import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Domain
import { Distributor } from './domain/entities/distributor.entity.js';
import { DISTRIBUTOR_REPOSITORY } from './domain/repositories/distributor.repository.interface.js';
import { MOVIE_CATALOG_GATEWAY } from './domain/ports/movie-catalog.gateway.port.js';
import { SETTLEMENT_LOOKUP } from './domain/ports/settlement-lookup.port.js';

// Infrastructure
import { TypeOrmDistributorRepository } from './infrastructure/persistence/typeorm-distributor.repository.js';
import { SqlMovieCatalogGatewayAdapter } from './infrastructure/adapters/sql-movie-catalog.gateway.adapter.js';
import { SqlSettlementLookupAdapter } from './infrastructure/adapters/sql-settlement-lookup.adapter.js';

// Application
import { DistributorsService } from './application/services/distributors.service.js';
import { DistributorMoviesService } from './application/services/distributor-movies.service.js';

// Presentation
import { DistributorsController } from './presentation/controllers/distributors.controller.js';

// Public API
import { DistributorsFacade } from './public-api/distributors.facade.js';

@Module({
  // Không còn đăng ký entity Movie: dữ liệu phim đi qua port IMovieCatalogGateway.
  imports: [TypeOrmModule.forFeature([Distributor])],
  controllers: [DistributorsController],
  providers: [
    // Repository (DIP)
    { provide: DISTRIBUTOR_REPOSITORY, useClass: TypeOrmDistributorRepository },

    // Ports tới module khác (adapter là nơi DUY NHẤT được chạm dữ liệu module khác)
    { provide: MOVIE_CATALOG_GATEWAY, useClass: SqlMovieCatalogGatewayAdapter },
    { provide: SETTLEMENT_LOOKUP, useClass: SqlSettlementLookupAdapter },

    // Services
    DistributorsService,
    DistributorMoviesService,

    // Public Facade
    DistributorsFacade,
  ],
  // Chỉ Facade được phép ra ngoài — không export service/repository nội bộ.
  exports: [DistributorsFacade],
})
export class DistributorsModule {}
