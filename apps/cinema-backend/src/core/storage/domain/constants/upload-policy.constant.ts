import { AssetResourceType } from '../enums/asset-resource-type.enum.js';

const MB = 1024 * 1024;

export interface UploadPolicy {
  allowedMimeTypes: readonly string[];
  /** Nhãn hiển thị trong thông báo lỗi. */
  allowedLabel: string;
  maxBytes: number;
}

/**
 * Chính sách upload theo loại tài nguyên.
 * LƯU Ý: giới hạn VIDEO (100MB, mp4/webm/mov) là giá trị mặc định do refactor đặt ra
 * (module upload cũ không có trong dữ liệu gửi kèm) — chỉnh tại đây nếu gói Cloudinary khác.
 */
export const UPLOAD_POLICIES: Record<AssetResourceType, UploadPolicy> = {
  [AssetResourceType.IMAGE]: {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedLabel: 'JPEG, PNG, WEBP',
    maxBytes: 5 * MB,
  },
  [AssetResourceType.VIDEO]: {
    allowedMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    allowedLabel: 'MP4, WEBM, MOV',
    maxBytes: 100 * MB,
  },
};

/** Giới hạn kích thước file dành cho Multer ở tầng controller (public-api re-export). */
export const STORAGE_UPLOAD_LIMITS = {
  IMAGE_MAX_BYTES: UPLOAD_POLICIES[AssetResourceType.IMAGE].maxBytes,
  VIDEO_MAX_BYTES: UPLOAD_POLICIES[AssetResourceType.VIDEO].maxBytes,
} as const;
