import { useCallback, useState } from "react";
import { orderService } from "@/features/orders/services/order.service";
import { PAYMENT_RETURN_URL } from "@/features/payments/config";
import { paymentService } from "@/features/payments/services/payment.service";
import { openPaymentPage } from "@/features/payments/utils/open-payment";
import { useBookingStore, type SelectedCombo } from "@/store/booking.store";
import { startCheckoutFlow } from "../utils/checkout-flow";
import { useHoldCountdown } from "./use-hold-countdown";

/**
 * Tạo đơn → khởi tạo thanh toán → mở VNPay → trả orderId khi người dùng quay lại app.
 * Kết quả (đã trả tiền hay chưa) do màn kết quả hỏi server.
 */
export function useCheckout() {
  const { isExpired } = useHoldCountdown();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (paymentMethod: string): Promise<number | null> => {
      if (isSubmitting) return null;
      const st = useBookingStore.getState();

      // Đơn đã tạo thì hạn thanh toán do server quản; chưa có đơn thì phải còn hạn giữ ghế.
      if (isExpired && !st.pendingOrder) {
        setError("Thời gian giữ ghế đã hết. Vui lòng chọn lại ghế.");
        return null;
      }
      if (st.showtimeId === null) {
        setError("Bạn chưa chọn ghế nào.");
        return null;
      }

      setError(null);
      setIsSubmitting(true);

      const result = await startCheckoutFlow(
        {
          showtimeId: st.showtimeId,
          seatIds: st.seats.map((s) => s.seatId),
          combos: Object.fromEntries(Object.values(st.combos).map((c: SelectedCombo) => [c.id, c.quantity])),
          voucherCode: st.voucher?.code,
          seatLabels: Object.fromEntries(st.seats.map((s) => [s.seatId, s.label])),
          uiPaymentMethod: paymentMethod,
          returnUrl: PAYMENT_RETURN_URL,
        },
        {
          orders: orderService,
          payments: paymentService,
          now: () => Date.now(),
          pending: st.pendingOrder,
          savePending: st.setPendingOrder,
          clearPending: () => useBookingStore.getState().setPendingOrder(null),
        },
      );

      if (!result.ok) {
        setError(result.message);
        setIsSubmitting(false);
        return null;
      }

      // Đơn đã giữ ghế ở server: bỏ giỏ phía app để các màn chọn ghế/bắp nước
      // không còn trả ghế hay bật cảnh báo hết hạn trong lúc đang thanh toán.
      useBookingStore.getState().finishCart();

      try {
        await openPaymentPage(result.paymentUrl);
      } catch {
        // Không mở được trình duyệt: màn kết quả cho phép thanh toán lại.
      }
      setIsSubmitting(false);
      return result.orderId;
    },
    [isSubmitting, isExpired],
  );

  return { submit, isSubmitting, error, clearError: () => setError(null) };
}
