/**
 * returnUrl mà VNPay đưa trình duyệt về sau khi thanh toán.
 * - Để trống (mặc định): dùng returnUrl mặc định của backend (trang web payment-result);
 *   người dùng đóng trình duyệt, app tự kiểm tra trạng thái đơn.
 * - Đặt EXPO_PUBLIC_PAYMENT_RETURN_URL=<deep link>: app tự đóng trình duyệt khi về đúng link đó.
 *   Chỉ dùng khi backend cho phép returnUrl này (xem hướng dẫn).
 */
export const PAYMENT_RETURN_URL: string | undefined =
  process.env.EXPO_PUBLIC_PAYMENT_RETURN_URL?.trim() || undefined;
