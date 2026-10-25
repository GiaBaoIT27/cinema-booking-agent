import { AssetResourceType } from '../../domain/enums/asset-resource-type.enum.js';
import type { AssetRef } from '../../domain/ports/file-storage.port.js';

/**
 * Trích public_id + loại tài nguyên từ URL Cloudinary dạng:
 * https://res.cloudinary.com/<cloud_name>/{image|video}/upload/v{version}/{public_id}.{ext}
 * Trả về null nếu URL không thuộc Cloudinary (VD: URL ngoài do admin tự nhập).
 */
const CLOUDINARY_URL_PATTERN =
  /^https:\/\/res\.cloudinary\.com\/[^/]+\/(image|video)\/upload\/(?:v\d+\/)?(.+?)\.[a-zA-Z0-9]+$/;

export function parseCloudinaryUrl(url: string | null | undefined): AssetRef | null {
  if (!url) return null;

  const match = CLOUDINARY_URL_PATTERN.exec(url);
  if (!match) return null;

  return {
    publicId: match[2],
    resourceType:
      match[1] === 'video' ? AssetResourceType.VIDEO : AssetResourceType.IMAGE,
  };
}
