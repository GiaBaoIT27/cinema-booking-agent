import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import type {
  UploadApiErrorResponse,
  UploadApiOptions,
  UploadApiResponse,
  v2 as CloudinaryClient,
} from 'cloudinary';
import { CLOUDINARY_CLIENT } from './cloudinary.provider.js';
import { UploadResponseDto } from './dto/upload-response.dto.js';

export enum StorageFolder {
  POSTER = 'cinema/posters',
  AVATAR = 'cinema/avatars',
  BANNER = 'cinema/banners',
  FNB = 'cinema/fnb',
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Hạ tầng upload/xoá ảnh. KHÔNG chứa nghiệp vụ (không biết "poster phim" là
 * gì) — module nghiệp vụ (movies, users...) tự chọn StorageFolder phù hợp
 * khi gọi upload().
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    @Inject(CLOUDINARY_CLIENT)
    private readonly cloudinary: typeof CloudinaryClient,
  ) {}

  async upload(
    file: { buffer: Buffer; mimetype: string; size: number },
    folder: StorageFolder,
  ): Promise<UploadResponseDto> {
    this.assertValidFile(file);

    const options: UploadApiOptions = {
      folder,
      resource_type: 'image',
      // Giới hạn kích thước tối đa, giữ tỉ lệ, không phóng to ảnh nhỏ hơn giới hạn.
      transformation: [{ width: 1600, height: 1600, crop: 'limit' }],
    };

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        options,
        (
          error: UploadApiErrorResponse | undefined,
          response: UploadApiResponse | undefined,
        ) => {
          if (error || !response) {
            reject(error ?? new Error('Cloudinary trả về response rỗng'));
            return;
          }
          resolve(response);
        },
      );
      uploadStream.end(file.buffer);
    });

    return {
      publicId: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };
  }

  async delete(publicId: string): Promise<void> {
    try {
      await this.cloudinary.uploader.destroy(publicId);
    } catch (error) {
      // Xoá ảnh thất bại KHÔNG nên làm vỡ luồng nghiệp vụ chính (VD: xoá movie
      // vẫn phải thành công dù ảnh trên Cloudinary xoá lỗi) — chỉ log để dọn tay sau.
      this.logger.error(
        `Failed to delete ${publicId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private assertValidFile(file: { mimetype: string; size: number }): void {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        `Loại file không được hỗ trợ: ${file.mimetype}. Chỉ nhận JPEG, PNG, WEBP.`,
      );
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File vượt quá kích thước cho phép (tối đa ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB)`,
      );
    }
  }
}
