import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FnbController } from './fnb.controller.js';
import { FnbService } from './fnb.service.js';
import { FnbItem } from './entities/fnb-item.entities.js';
import { UploadModule } from '#modules/upload/upload.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([FnbItem]), UploadModule],
  controllers: [FnbController],
  providers: [FnbService],
  exports: [FnbService],
})
export class FnbModule {}
