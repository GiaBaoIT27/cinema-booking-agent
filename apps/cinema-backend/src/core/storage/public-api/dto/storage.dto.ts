import type { AssetResourceType } from '../../domain/enums/asset-resource-type.enum.js';

/** File thô do Multer cung cấp (module khác truyền vào để upload). */
export interface UploadFileDto {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

/** Tham chiếu asset đã lưu — đủ để xoá về sau. */
export interface AssetRefDto {
  publicId: string;
  resourceType: AssetResourceType;
}

export interface StoredAssetDto extends AssetRefDto {
  url: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
}
