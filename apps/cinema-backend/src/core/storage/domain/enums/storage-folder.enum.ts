/**
 * Thư mục lưu trữ logic (không phụ thuộc nhà cung cấp lưu trữ).
 * Module nghiệp vụ tự chọn giá trị phù hợp khi upload; muốn thêm loại mới chỉ thêm 1 giá trị ở đây.
 */
export enum StorageFolder {
  POSTER = 'cinema/posters',
  AVATAR = 'cinema/avatars',
  BANNER = 'cinema/banners',
  FNB = 'cinema/fnb',
  TRAILER = 'cinema/trailers',
}
