import { Module } from '@nestjs/common';

// Domain
import { FILE_STORAGE } from './domain/ports/file-storage.port.js';

// Infrastructure
import { cloudinaryProvider } from './infrastructure/cloudinary/cloudinary.provider.js';
import { CloudinaryFileStorageAdapter } from './infrastructure/adapters/cloudinary-file-storage.adapter.js';

// Application
import { StorageService } from './application/services/storage.service.js';

// Presentation
import { UploadsController } from './presentation/controllers/uploads.controller.js';

// Public API
import { StorageFacade } from './public-api/storage.facade.js';

@Module({
  controllers: [UploadsController],
  providers: [
    cloudinaryProvider,
    // Port lưu trữ file (đổi nhà cung cấp chỉ cần đổi useClass)
    { provide: FILE_STORAGE, useClass: CloudinaryFileStorageAdapter },

    StorageService,

    // Public Facade
    StorageFacade,
  ],
  // Chỉ Facade được phép ra ngoài — không export StorageService / adapter.
  exports: [StorageFacade],
})
export class StorageModule {}
