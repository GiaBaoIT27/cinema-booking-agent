import { Injectable } from '@nestjs/common';
import {
  StorageFacade,
  StorageFolder,
} from '#src/core/storage/public-api/index.js';
import type { UploadFileDto } from '#src/core/storage/public-api/index.js';
import { Movie } from '../../domain/entities/movie.entity.js';
import type {
  MovieMediaFiles,
  ResolvedMovieMedia,
} from '../models/movie-media.model.js';

type MediaUrlKey = 'posterUrl' | 'bannerUrl' | 'trailerUrl';

/** Cấu hình 3 slot media: field file, field URL tương ứng, thư mục lưu và loại tài nguyên. */
const MEDIA_SLOTS = [
  {
    file: 'posterFile',
    url: 'posterUrl',
    folder: StorageFolder.POSTER,
    kind: 'image',
  },
  {
    file: 'bannerFile',
    url: 'bannerUrl',
    folder: StorageFolder.BANNER,
    kind: 'image',
  },
  {
    file: 'trailerFile',
    url: 'trailerUrl',
    folder: StorageFolder.TRAILER,
    kind: 'video',
  },
] as const;

const toUploadInput = (file: Express.Multer.File): UploadFileDto => ({
  buffer: file.buffer,
  mimetype: file.mimetype,
  size: file.size,
});

/**
 * Xử lý media (poster/banner/trailer) của phim trên nền StorageFacade:
 * - Có file đính kèm → upload; ngược lại → dùng URL trong DTO, rồi tới URL đang lưu.
 * - File mới ghi đè URL cũ → ghi nhận asset cũ để xóa SAU khi lưu DB thành công.
 * - Lưu DB thất bại → xóa các asset vừa upload (không để rác trên cloud).
 */
@Injectable()
export class MovieMediaService {
  constructor(private readonly storage: StorageFacade) {}

  async resolve(
    dtoUrls: Partial<Record<MediaUrlKey, string>>,
    currentMovie: Pick<Movie, MediaUrlKey> | null,
    files?: MovieMediaFiles,
  ): Promise<ResolvedMovieMedia> {
    const resolved: ResolvedMovieMedia = {
      posterUrl: dtoUrls.posterUrl || currentMovie?.posterUrl || null,
      bannerUrl: dtoUrls.bannerUrl || currentMovie?.bannerUrl || null,
      trailerUrl: dtoUrls.trailerUrl || currentMovie?.trailerUrl || null,
      uploadedAssets: [],
      replacedAssets: [],
    };

    try {
      for (const slot of MEDIA_SLOTS) {
        const file = files?.[slot.file]?.[0];
        if (!file) continue;

        const input = toUploadInput(file);
        const stored =
          slot.kind === 'video'
            ? await this.storage.uploadVideo(input, slot.folder)
            : await this.storage.uploadImage(input, slot.folder);

        resolved[slot.url] = stored.url;
        resolved.uploadedAssets.push({
          publicId: stored.publicId,
          resourceType: stored.resourceType,
        });

        // Slot có file mới ghi đè URL cũ đang lưu trong DB → dọn asset cũ sau
        const oldAsset = this.storage.resolveAssetFromUrl(
          currentMovie?.[slot.url] ?? null,
        );
        if (oldAsset) resolved.replacedAssets.push(oldAsset);
      }
    } catch (error) {
      // Một slot lỗi → xóa các slot đã upload trong request này rồi báo lỗi
      await this.discardUploaded(resolved);
      throw error;
    }

    return resolved;
  }

  /** Lưu DB thất bại → xóa asset vừa upload (best-effort). */
  async discardUploaded(media: ResolvedMovieMedia): Promise<void> {
    await Promise.all(
      media.uploadedAssets.map((asset) => this.storage.deleteAsset(asset)),
    );
  }

  /** Lưu DB thành công → xóa asset cũ bị thay thế (best-effort). */
  async cleanupReplaced(media: ResolvedMovieMedia): Promise<void> {
    await Promise.all(
      media.replacedAssets.map((asset) => this.storage.deleteAsset(asset)),
    );
  }

  /** Xóa phim thành công → xóa toàn bộ media của phim (URL ngoài hệ thống tự bị bỏ qua). */
  async discardMovieAssets(movie: Pick<Movie, MediaUrlKey>): Promise<void> {
    await Promise.all(
      [movie.posterUrl, movie.bannerUrl, movie.trailerUrl].map((url) =>
        this.storage.deleteByUrl(url),
      ),
    );
  }
}
