import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '#src/common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '#src/common/guards/permissions.guard.js';
import { RequirePermissions } from '#src/common/decorators/permissions.decorator.js';
import { StorageFolder } from '../../domain/enums/storage-folder.enum.js';
import { STORAGE_UPLOAD_LIMITS } from '../../domain/constants/upload-policy.constant.js';
import { StorageService } from '../../application/services/storage.service.js';
import { MissingUploadFileException } from '../../application/exceptions/storage.exceptions.js';
import { toUploadResponse } from '../../application/mappers/stored-asset.mapper.js';
import type { UploadResponseDto } from '../../application/dto/upload-response.dto.js';

const FILE_INTERCEPTOR_OPTIONS = {
  limits: { fileSize: STORAGE_UPLOAD_LIMITS.IMAGE_MAX_BYTES },
};

/**
 * Endpoint upload ảnh DÙNG CHUNG cho mọi module nghiệp vụ, nhưng TÁCH RIÊNG 1 route cho mỗi
 * StorageFolder — không dùng 1 route với query param ?folder=..., vì @RequirePermissions()
 * đọc metadata tĩnh, không thể đổi quyền yêu cầu theo giá trị query lúc runtime.
 *
 * Muốn thêm loại ảnh mới: thêm 1 giá trị StorageFolder + 1 method @Post ở đây.
 */
@Controller('uploads')
export class UploadsController {
  constructor(private readonly storageService: StorageService) {}

  @Post('posters')
  @RequirePermissions('movie:update')
  @UseInterceptors(FileInterceptor('file', FILE_INTERCEPTOR_OPTIONS))
  uploadPoster(@UploadedFile() file?: Express.Multer.File) {
    return this.uploadImage(file, StorageFolder.POSTER);
  }

  @Post('banners')
  @RequirePermissions('banner:update')
  @UseInterceptors(FileInterceptor('file', FILE_INTERCEPTOR_OPTIONS))
  uploadBanner(@UploadedFile() file?: Express.Multer.File) {
    return this.uploadImage(file, StorageFolder.BANNER);
  }

  @Post('fnb')
  @RequirePermissions('fnb:update')
  @UseInterceptors(FileInterceptor('file', FILE_INTERCEPTOR_OPTIONS))
  uploadFnbImage(@UploadedFile() file?: Express.Multer.File) {
    return this.uploadImage(file, StorageFolder.FNB);
  }

  @Post('avatars')
  // Không cần permission đặc biệt — ai đã đăng nhập (JwtAuthGuard) cũng được đổi avatar của chính mình.
  @UseInterceptors(FileInterceptor('file', FILE_INTERCEPTOR_OPTIONS))
  uploadAvatar(@UploadedFile() file?: Express.Multer.File) {
    return this.uploadImage(file, StorageFolder.AVATAR);
  }

  private async uploadImage(
    file: Express.Multer.File | undefined,
    folder: StorageFolder,
  ): Promise<UploadResponseDto> {
    if (!file) throw new MissingUploadFileException();

    const asset = await this.storageService.uploadImage(
      { buffer: file.buffer, mimetype: file.mimetype, size: file.size },
      folder,
    );
    return toUploadResponse(asset);
  }
}
