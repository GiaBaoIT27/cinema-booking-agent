import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// import { CacheModule } from '@nestjs/cache-manager';
import { SeatType } from './entities/seat-type.entity.js';
import { SeatTypeService } from './seat-type.service.js';
import { SeatTypeController } from './seat-type.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([SeatType])],
  controllers: [SeatTypeController],
  providers: [SeatTypeService],
  exports: [SeatTypeService],
})
export class SeatTypeModule {}
