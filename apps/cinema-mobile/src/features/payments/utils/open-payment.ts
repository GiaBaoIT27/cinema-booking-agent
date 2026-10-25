import * as WebBrowser from "expo-web-browser";
import { PAYMENT_RETURN_URL } from "../config";

/**
 * Mở cổng thanh toán và đợi người dùng quay lại app.
 * Kết quả thật luôn lấy từ trạng thái đơn trên server (IPN), không dựa vào URL trả về.
 */
export async function openPaymentPage(paymentUrl: string): Promise<void> {
  try {
    if (PAYMENT_RETURN_URL) {
      await WebBrowser.openAuthSessionAsync(paymentUrl, PAYMENT_RETURN_URL);
    } else {
      await WebBrowser.openBrowserAsync(paymentUrl, {
        dismissButtonStyle: "close",
        controlsColor: "#EF4444",
      });
    }
  } finally {
    WebBrowser.dismissBrowser();
  }
}
