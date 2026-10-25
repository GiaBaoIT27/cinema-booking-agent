import { AssetResourceType } from '../enums/asset-resource-type.enum.js';
import { StorageFolder } from '../enums/storage-folder.enum.js';

export interface UploadFileInput {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

/** Tham chiếu tới một asset đã lưu (đủ để xoá về sau). */
export interface AssetRef {
  publicId: string;
  resourceType: AssetResourceType;
}

export interface StoredAsset extends AssetRef {
  url: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
}

/**
 * Cổng lưu trữ file. Hiện thực hiện tại: Cloudinary (infrastructure/adapters).
 * Domain/Application không biết nhà cung cấp cụ thể → đổi sang S3... chỉ cần viết adapter mới.
 */
export interface IFileStorage {
  upload(
    file: UploadFileInput,
    folder: StorageFolder,
    resourceType: AssetResourceType,
  ): Promise<StoredAsset>;

  /** Ném lỗi nếu nhà cung cấp từ chối — lớp application quyết định nuốt lỗi hay không. */
  delete(asset: AssetRef): Promise<void>;

  /** Phân tích URL do chính nhà cung cấp này sinh ra; URL ngoài hệ thống → null. */
  parseUrl(url: string): AssetRef | null;
}

export const FILE_STORAGE = Symbol('FILE_STORAGE');
