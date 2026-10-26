export interface NewsItem {
  id: string;
  title: string;
  summary?: string;
  imageUrl: string | null;
  /** Link mở trong trình duyệt khi bấm vào tin */
  url?: string;
  publishedAt?: string;
}

/**
 * Tin tức: chưa có API tin tức nên để trống, mục "Tin tức" ở trang chủ tự ẩn khi mảng rỗng.
 * Khi backend có endpoint, thay bằng một hook gọi API trả về NewsItem[].
 */
export const NEWS: NewsItem[] = [];
