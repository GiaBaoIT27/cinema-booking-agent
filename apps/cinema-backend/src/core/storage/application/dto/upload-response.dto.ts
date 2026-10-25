/**
 * DTO output thuần — luôn được tạo bằng object literal, không bao giờ `new UploadResponseDto()`.
 */
export class UploadResponseDto {
  /** Dùng khi cần xoá file sau này (StorageService.delete). */
  publicId!: string;
  url!: string;
  width?: number;
  height?: number;
  format!: string;
  bytes!: number;
}
