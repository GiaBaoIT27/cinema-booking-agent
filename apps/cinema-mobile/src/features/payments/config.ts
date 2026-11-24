import { API_URL } from "@/lib/config";

/**
 * Deep link để trình duyệt trong app tự đóng sau khi thanh toán (tùy chọn).
 * - Đặt EXPO_PUBLIC_PAYMENT_RETURN_URL=<deep link> (VD: cinemamobile://booking/result,
 *   hoặc exp://<IP>:8081/--/booking/result khi chạy Expo Go): app tự đóng trình duyệt
 *   khi về đúng link đó.
 * - Để trống: người dùng tự đóng trình duyệt; app tự kiểm tra trạng thái đơn.
 */
export const PAYMENT_RETURN_URL: string | undefined =
  process.env.EXPO_PUBLIC_PAYMENT_RETURN_URL?.trim() || undefined;

/**
 * Địa chỉ gửi cho backend khi khởi tạo thanh toán. VNPay luôn quay về backend để chốt
 * thanh toán trước, rồi backend mới chuyển trình duyệt tới địa chỉ này:
 * - có deep link: về thẳng app;
 * - không có: trang /payments/vnpay/done của backend (điện thoại mở được, khác với
 *   trang web localhost:3001 chỉ có trên máy tính).
 */
export const PAYMENT_CLIENT_RETURN_URL: string =
  PAYMENT_RETURN_URL ?? `${API_URL.replace(/\/+$/, "")}/payments/vnpay/done`;
