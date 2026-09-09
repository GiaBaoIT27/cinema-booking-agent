import { Module } from '@nestjs/common';
import { UploadService } from './upload.service.js';
import { CloudinaryProvider } from './cloudinary.provider.js';

@Module({
  providers: [UploadService, CloudinaryProvider],
  exports: [UploadService],
})
export class UploadModule {}
