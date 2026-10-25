import type { StoredAsset } from '../../domain/ports/file-storage.port.js';
import type { UploadResponseDto } from '../dto/upload-response.dto.js';

/** Response của các endpoint POST /uploads/* (giữ nguyên contract cũ, không có resourceType). */
export function toUploadResponse(asset: StoredAsset): UploadResponseDto {
  return {
    publicId: asset.publicId,
    url: asset.url,
    width: asset.width,
    height: asset.height,
    format: asset.format,
    bytes: asset.bytes,
  };
}
