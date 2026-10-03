import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Province } from './domain/entities/province.entity.js';
import { Ward } from './domain/entities/ward.entity.js';
import { PROVINCE_REPOSITORY } from './domain/repositories/province.repository.interface.js';
import { WARD_REPOSITORY } from './domain/repositories/ward.repository.interface.js';
import { LOCATION_CACHE } from './application/ports/location-cache.port.js';

import { TypeOrmProvinceRepository } from './infrastructure/persistence/typeorm-province.repository.js';
import { TypeOrmWardRepository } from './infrastructure/persistence/typeorm-ward.repository.js';
import { RedisLocationCache } from './infrastructure/cache/redis-location.cache.js';

import { ProvincesController } from './presentation/controllers/provinces.controller.js';
import { WardsController } from './presentation/controllers/wards.controller.js';
import { ProvincesService } from './application/services/provinces.service.js';
import { WardsService } from './application/services/wards.service.js';
import { LocationsFacade } from './public-api/locations.facade.js';

@Module({
  imports: [TypeOrmModule.forFeature([Province, Ward])],
  controllers: [ProvincesController, WardsController],
  providers: [
    { provide: PROVINCE_REPOSITORY, useClass: TypeOrmProvinceRepository },
    { provide: WARD_REPOSITORY, useClass: TypeOrmWardRepository },
    { provide: LOCATION_CACHE, useClass: RedisLocationCache },
    ProvincesService,
    WardsService,
    LocationsFacade,
  ],
  exports: [LocationsFacade], // Only export facade for other modules
})
export class LocationsModule {}
