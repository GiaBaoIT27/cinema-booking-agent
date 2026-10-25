import { Injectable } from '@nestjs/common';
import { StorageFolder } from '../domain/enums/storage-folder.enum.js';
import { StorageService } from '../application/services/storage.service.js';
import type {
  AssetRefDto,
  StoredAssetDto,
  UploadFileDto,
} from './dto/storage.dto.js';

/**
 * Facade công khai của Storage module — cổng DUY NHẤT để module khác (movies, users, fnb...)
 * upload / xoá media. Module khác CHỈ import từ `#src/core/storage/public-api`.
 */
@Injectable()
export class StorageFacade {
  constructor(private readonly storageService: StorageService) {}

  /** Upload ảnh (JPEG/PNG/WEBP, tối đa 5MB). Ném BadRequest nếu file không hợp lệ. */
  uploadImage(file: UploadFileDto, folder: StorageFolder): Promise<StoredAssetDto> {
    return this.storageService.uploadImage(file, folder);
  }

  /** Upload video (MP4/WEBM/MOV, tối đa 100MB). Ném BadRequest nếu file không hợp lệ. */
  uploadVideo(file: UploadFileDto, folder: StorageFolder): Promise<StoredAssetDto> {
    return this.storageService.uploadVideo(file, folder);
  }

  /** Xoá asset (best-effort, không bao giờ ném lỗi). */
  deleteAsset(asset: AssetRefDto): Promise<void> {
    return this.storageService.delete(asset);
  }

  /** Xoá asset theo URL đã lưu trong DB (best-effort); URL ngoài hệ thống bị bỏ qua. */
  deleteByUrl(url: string | null | undefined): Promise<void> {
    return this.storageService.deleteByUrl(url);
  }

  /** URL → tham chiếu asset; null nếu URL không do dịch vụ lưu trữ này sinh ra. */
  resolveAssetFromUrl(url: string | null | undefined): AssetRefDto | null {
    return this.storageService.resolveAssetFromUrl(url);
  }
}
