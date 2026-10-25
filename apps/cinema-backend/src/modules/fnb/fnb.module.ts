import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TypeOrmFnbRepository } from './infrastructure/persistence/typeorm-fnb.repository.js';
import { FnbController } from './presentation/controllers/fnb.controller.js';
import { FnbService } from './application/services/fnb.service.js';
import { FnbFacade } from './public-api/fnb.facade.js';
import { FnbItem } from './domain/entities/fnb-item.entities.js';
import { FNB_REPOSITORY } from './domain/repositories/fnb.repository.interface.js';
import { FnbMediaService } from './application/services/fnb-media.service.js';
import { StorageModule } from '#src/core/storage/storage.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([FnbItem]), StorageModule],
  controllers: [FnbController],
  providers: [
    {
      provide: FNB_REPOSITORY,
      useClass: TypeOrmFnbRepository,
    },
    FnbService,
    FnbMediaService,
    FnbFacade,
  ],
  exports: [FnbFacade],
})
export class FnbModule {}
