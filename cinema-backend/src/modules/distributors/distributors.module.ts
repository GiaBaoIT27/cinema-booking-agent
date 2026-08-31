import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DistributorsController } from './distributors.controller.js';
import { DistributorsService } from './distributors.service.js';
import { Distributor } from './entities/distributor.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Distributor])],
  controllers: [DistributorsController],
  providers: [DistributorsService],
  exports: [DistributorsService],
})
export class DistributorsModule {}
