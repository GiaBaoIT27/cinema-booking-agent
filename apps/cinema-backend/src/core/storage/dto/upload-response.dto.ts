/**
 * DTO output thuần — luôn được tạo bằng object literal (return { publicId: ..., ... }),
 * không bao giờ `new UploadResponseDto()`. Dùng `!:` để báo TypeScript field
 * chắc chắn có giá trị khi dùng, dù constructor không gán trực tiếp.
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
