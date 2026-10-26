import * as WebBrowser from "expo-web-browser";
import { PAYMENT_RETURN_URL } from "../config";

/**
 * Mở cổng thanh toán và đợi người dùng quay lại app.
 * Kết quả thật luôn lấy từ trạng thái đơn trên server (IPN), không dựa vào URL trả về.
 *
 * - Nếu có PAYMENT_RETURN_URL (deep link): dùng openAuthSessionAsync — trình duyệt
 *   tự đóng khi VNPay redirect về đúng URL đó.
 * - Nếu không có: dùng openBrowserAsync — người dùng đóng trình duyệt thủ công.
 *
 * LƯU Ý: KHÔNG gọi dismissBrowser() sau khi await kết thúc vì lúc đó browser đã
 * đóng rồi → sẽ throw "There is no web browser to dismiss".
 * dismissBrowser() chỉ dùng để chủ động đóng browser từ một luồng khác (VD: deep link).
 */
export async function openPaymentPage(paymentUrl: string): Promise<void> {
  if (PAYMENT_RETURN_URL) {
    // openAuthSessionAsync tự đóng browser khi nhận đúng redirect URL.
    await WebBrowser.openAuthSessionAsync(paymentUrl, PAYMENT_RETURN_URL);
  } else {
    // openBrowserAsync resolve khi user đóng browser thủ công.
    await WebBrowser.openBrowserAsync(paymentUrl, {
      dismissButtonStyle: "close",
      controlsColor: "#EF4444",
    });
  }
}
