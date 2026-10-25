import { UPLOAD_POLICIES } from '../constants/upload-policy.constant.js';
import { AssetResourceType } from '../enums/asset-resource-type.enum.js';

export type UploadViolation =
  | { kind: 'UNSUPPORTED_TYPE'; mimetype: string; allowedLabel: string }
  | { kind: 'TOO_LARGE'; maxMegabytes: number };

/** Kiểm tra file theo chính sách của loại tài nguyên. Hợp lệ → null. */
export function findUploadViolation(
  file: { mimetype: string; size: number },
  resourceType: AssetResourceType,
): UploadViolation | null {
  const policy = UPLOAD_POLICIES[resourceType];

  if (!policy.allowedMimeTypes.includes(file.mimetype)) {
    return {
      kind: 'UNSUPPORTED_TYPE',
      mimetype: file.mimetype,
      allowedLabel: policy.allowedLabel,
    };
  }
  if (file.size > policy.maxBytes) {
    return { kind: 'TOO_LARGE', maxMegabytes: policy.maxBytes / 1024 / 1024 };
  }
  return null;
}
