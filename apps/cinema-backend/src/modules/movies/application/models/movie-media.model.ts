import type { AssetRefDto } from '#src/core/storage/public-api/index.js';

/** 3 slot media của phim đính kèm theo multipart/form-data. */
export interface MovieMediaFiles {
  posterFile?: Express.Multer.File[];
  bannerFile?: Express.Multer.File[];
  trailerFile?: Express.Multer.File[];
}

/** Kết quả xử lý media: URL cuối cùng + các asset cần dọn dẹp. */
export interface ResolvedMovieMedia {
  posterUrl: string | null;
  bannerUrl: string | null;
  trailerUrl: string | null;
  /** Asset MỚI vừa upload trong request này — xóa đi nếu lưu DB thất bại (tránh rác trên cloud). */
  uploadedAssets: AssetRefDto[];
  /** Asset CŨ bị file mới thay thế — xóa sau khi lưu DB thành công. */
  replacedAssets: AssetRefDto[];
}
