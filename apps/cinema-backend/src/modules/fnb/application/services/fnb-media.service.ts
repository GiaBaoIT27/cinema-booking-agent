import { Injectable } from '@nestjs/common';
import {
  StorageFacade,
  StorageFolder,
} from '#src/core/storage/public-api/index.js';
import type {
  AssetRefDto,
  UploadFileDto,
} from '#src/core/storage/public-api/index.js';
import { FnbItem } from '../../domain/entities/fnb-item.entities.js';

export interface ResolvedFnbMedia {
  imageUrl: string | null;
  /** Asset MỚI vừa upload trong request này — xóa đi nếu lưu DB thất bại (tránh rác trên cloud). */
  uploadedAsset: AssetRefDto | null;
  /** Asset CŨ bị file mới thay thế — xóa sau khi lưu DB thành công. */
  replacedAsset: AssetRefDto | null;
}

const toUploadInput = (file: Express.Multer.File): UploadFileDto => ({
  buffer: file.buffer,
  mimetype: file.mimetype,
  size: file.size,
});

/**
 * Xử lý media (ảnh đại diện) của sản phẩm F&B trên nền StorageFacade:
 * - Có file đính kèm → upload; ngược lại → dùng URL trong DTO, rồi tới URL đang lưu.
 * - File mới ghi đè URL cũ → ghi nhận asset cũ để xóa SAU khi lưu DB thành công.
 * - Lưu DB thất bại → xóa asset vừa upload (không để rác trên cloud).
 */
@Injectable()
export class FnbMediaService {
  constructor(private readonly storage: StorageFacade) {}

  async resolve(
    dtoImageUrl: string | undefined,
    currentItem: Pick<FnbItem, 'imageUrl'> | null,
    file?: Express.Multer.File,
  ): Promise<ResolvedFnbMedia> {
    const resolved: ResolvedFnbMedia = {
      imageUrl: dtoImageUrl || currentItem?.imageUrl || null,
      uploadedAsset: null,
      replacedAsset: null,
    };

    if (file) {
      try {
        const input = toUploadInput(file);
        const stored = await this.storage.uploadImage(input, StorageFolder.FNB);

        resolved.imageUrl = stored.url;
        resolved.uploadedAsset = {
          publicId: stored.publicId,
          resourceType: stored.resourceType,
        };

        // File mới ghi đè URL cũ đang lưu trong DB → ghi nhận asset cũ để dọn sau khi lưu DB thành công
        const oldAsset = this.storage.resolveAssetFromUrl(
          currentItem?.imageUrl ?? null,
        );
        if (oldAsset) {
          resolved.replacedAsset = oldAsset;
        }
      } catch (error) {
        // Upload lỗi → đảm bảo không còn asset rác
        await this.discardUploaded(resolved);
        throw error;
      }
    }

    return resolved;
  }

  /** Lưu DB thất bại → xóa asset vừa upload (best-effort, tránh rác trên cloud). */
  async discardUploaded(media: ResolvedFnbMedia): Promise<void> {
    if (media.uploadedAsset) {
      await this.storage.deleteAsset(media.uploadedAsset);
    }
  }

  /** Lưu DB thành công → xóa asset cũ bị thay thế (best-effort). */
  async cleanupReplaced(media: ResolvedFnbMedia): Promise<void> {
    if (media.replacedAsset) {
      await this.storage.deleteAsset(media.replacedAsset);
    }
  }

  /** Xóa món F&B thành công → xóa ảnh tương ứng trên cloud (URL ngoài hệ thống tự bị bỏ qua). */
  async discardItemAssets(item: Pick<FnbItem, 'imageUrl'>): Promise<void> {
    if (item.imageUrl) {
      await this.storage.deleteByUrl(item.imageUrl);
    }
  }
}
