"use client";

import { useCallback, useState } from "react";
import { orderService } from "@/features/orders/services/order.service";
import { paymentService } from "@/features/payments/services/payment.service";
import { useBooking } from "../context/booking-context";
import { useHoldCountdown } from "./use-hold-countdown";
import { startCheckoutFlow } from "../utils/checkout-flow";
import {
  clearPendingOrder,
  loadPendingOrder,
  savePendingOrder,
} from "../utils/pending-order";

/** Tạo đơn → khởi tạo thanh toán → chuyển sang cổng thanh toán */
export function useCheckout() {
  const {
    showtimeId,
    selectedSeats,
    selectedCombos,
    discountCode,
    paymentMethod,
  } = useBooking();
  const { isExpired } = useHoldCountdown();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    if (isSubmitting) return;
    if (isExpired) {
      setError("Thời gian giữ ghế đã hết. Vui lòng chọn lại ghế.");
      return;
    }
    setError(null);
    setIsSubmitting(true);

    const result = await startCheckoutFlow(
      {
        showtimeId,
        seatIds: selectedSeats.map((s) => s.id),
        combos: selectedCombos,
        voucherCode: discountCode || undefined,
        uiPaymentMethod: paymentMethod,
      },
      {
        orders: orderService,
        payments: paymentService,
        now: () => Date.now(),
        pending: loadPendingOrder(),
        savePending: savePendingOrder,
        clearPending: clearPendingOrder,
      },
    );

    if (result.ok) {
      // Giữ isSubmitting = true trong lúc trình duyệt chuyển trang
      window.location.assign(result.paymentUrl);
      return;
    }
    setError(result.message);
    setIsSubmitting(false);
  }, [
    isSubmitting,
    isExpired,
    showtimeId,
    selectedSeats,
    selectedCombos,
    discountCode,
    paymentMethod,
  ]);

  return { submit, isSubmitting, error, clearError: () => setError(null) };
}
