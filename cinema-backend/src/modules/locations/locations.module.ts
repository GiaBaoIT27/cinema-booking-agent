import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Province } from './entities/province.entity.js';
import { Ward } from './entities/ward.entity.js';
import { ProvincesController } from './provinces.controller.js';
import { ProvincesService } from './provinces.service.js';
import { WardsController } from './wards.controller.js';
import { WardsService } from './wards.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Province, Ward])],
  controllers: [ProvincesController, WardsController],
  providers: [ProvincesService, WardsService],
  exports: [ProvincesService, WardsService],
})
export class LocationsModule {}
