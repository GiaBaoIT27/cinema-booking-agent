import { Module } from '@nestjs/common';
import { cloudinaryProvider } from './cloudinary.provider.js';
import { StorageController } from './storage.controller.js';
import { StorageService } from './storage.service.js';

@Module({
  controllers: [StorageController],
  providers: [cloudinaryProvider, StorageService],
  exports: [StorageService],
})
export class StorageModule {}
