export interface MovieMediaFiles {
  posterFile?: Express.Multer.File[];
  bannerFile?: Express.Multer.File[];
  trailerFile?: Express.Multer.File[];
}

// Kết quả xử lý media: URL cuối cùng + danh sách asset cũ bị thay thế
export interface ResolvedMovieMedia {
  posterUrl: string | null;
  bannerUrl: string | null;
  trailerUrl: string | null;
  replacedAssets: Array<{
    publicId: string;
    resourceType: 'image' | 'video';
  }>;
}
