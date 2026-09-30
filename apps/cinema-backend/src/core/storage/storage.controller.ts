import {
  BadRequestException,
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
import { StorageFolder, StorageService } from './storage.service.js';
import { UploadResponseDto } from './dto/upload-response.dto.js';

const FILE_INTERCEPTOR_OPTIONS = { limits: { fileSize: 5 * 1024 * 1024 } };

/**
 * Endpoint upload DÙNG CHUNG cho mọi module nghiệp vụ cần ảnh, nhưng TÁCH
 * RIÊNG 1 route cho mỗi StorageFolder — không dùng 1 route với query param
 * ?folder=..., vì @RequirePermissions() đọc metadata tĩnh lúc compile-time,
 * không thể tự đổi quyền yêu cầu theo giá trị query lúc runtime. Tách route
 * giữ quyền kiểm tra đúng đắn và tường minh.
 *
 * Muốn thêm loại ảnh mới: thêm 1 giá trị StorageFolder + 1 method @Post ở đây.
 */
@Controller('uploads')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('posters')
  @RequirePermissions('movie:update')
  @UseInterceptors(FileInterceptor('file', FILE_INTERCEPTOR_OPTIONS))
  uploadPoster(
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    return this.storageService.upload(
      this.toUploadInput(file),
      StorageFolder.POSTER,
    );
  }

  @Post('banners')
  @RequirePermissions('banner:update')
  @UseInterceptors(FileInterceptor('file', FILE_INTERCEPTOR_OPTIONS))
  uploadBanner(
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    return this.storageService.upload(
      this.toUploadInput(file),
      StorageFolder.BANNER,
    );
  }

  @Post('fnb')
  @RequirePermissions('fnb:update')
  @UseInterceptors(FileInterceptor('file', FILE_INTERCEPTOR_OPTIONS))
  uploadFnbImage(
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    return this.storageService.upload(
      this.toUploadInput(file),
      StorageFolder.FNB,
    );
  }

  @Post('avatars')
  // Không cần permission đặc biệt — ai đã đăng nhập (JwtAuthGuard) cũng được đổi avatar của chính mình.
  @UseInterceptors(FileInterceptor('file', FILE_INTERCEPTOR_OPTIONS))
  uploadAvatar(
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    return this.storageService.upload(
      this.toUploadInput(file),
      StorageFolder.AVATAR,
    );
  }

  private toUploadInput(file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('Thiếu file upload (field "file")');
    }
    return { buffer: file.buffer, mimetype: file.mimetype, size: file.size };
  }
}
