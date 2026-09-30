/**
 * Trạng thái chung dùng lại nhiều entity trong hệ thống.
 * Đặt tại shared-kernel để tránh định nghĩa lặp tại từng module.
 */
export enum Status {
  /** Đang hoạt động bình thường */
  ACTIVE = 'ACTIVE',

  /** Tạm ngưng — có thể kích hoạt lại */
  INACTIVE = 'INACTIVE',

  /** Lưu trữ — không hiển thị, không xóa khỏi DB */
  ARCHIVED = 'ARCHIVED',
}
