import { Inject, Injectable, Logger } from '@nestjs/common';
import { AssetResourceType } from '../../domain/enums/asset-resource-type.enum.js';
import { StorageFolder } from '../../domain/enums/storage-folder.enum.js';
import { FILE_STORAGE } from '../../domain/ports/file-storage.port.js';
import type {
  AssetRef,
  IFileStorage,
  StoredAsset,
  UploadFileInput,
} from '../../domain/ports/file-storage.port.js';
import { findUploadViolation } from '../../domain/services/upload-policy.rules.js';
import {
  InvalidUploadFileException,
  StorageUploadFailedException,
} from '../exceptions/storage.exceptions.js';

/**
 * Hạ tầng upload/xoá media. KHÔNG chứa nghiệp vụ (không biết "poster phim" là gì) —
 * module nghiệp vụ tự chọn StorageFolder phù hợp khi gọi upload.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    @Inject(FILE_STORAGE)
    private readonly fileStorage: IFileStorage,
  ) {}

  uploadImage(file: UploadFileInput, folder: StorageFolder): Promise<StoredAsset> {
    return this.upload(file, folder, AssetResourceType.IMAGE);
  }

  uploadVideo(file: UploadFileInput, folder: StorageFolder): Promise<StoredAsset> {
    return this.upload(file, folder, AssetResourceType.VIDEO);
  }

  /**
   * Xoá asset (best-effort): thất bại KHÔNG làm vỡ luồng nghiệp vụ chính
   * (VD: xoá phim vẫn phải thành công dù xoá ảnh lỗi) — chỉ log để dọn tay sau.
   */
  async delete(asset: AssetRef): Promise<void> {
    try {
      await this.fileStorage.delete(asset);
    } catch (error) {
      this.logger.error(
        `Failed to delete ${asset.resourceType}:${asset.publicId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /** Xoá asset theo URL đã lưu; URL rỗng hoặc không thuộc nhà cung cấp → bỏ qua. */
  async deleteByUrl(url: string | null | undefined): Promise<void> {
    const asset = this.resolveAssetFromUrl(url);
    if (asset) await this.delete(asset);
  }

  resolveAssetFromUrl(url: string | null | undefined): AssetRef | null {
    return url ? this.fileStorage.parseUrl(url) : null;
  }

  private async upload(
    file: UploadFileInput,
    folder: StorageFolder,
    resourceType: AssetResourceType,
  ): Promise<StoredAsset> {
    const violation = findUploadViolation(file, resourceType);
    if (violation) throw new InvalidUploadFileException(violation);

    try {
      return await this.fileStorage.upload(file, folder, resourceType);
    } catch (error) {
      this.logger.error(
        `Upload ${resourceType} to ${folder} failed`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new StorageUploadFailedException();
    }
  }
}
