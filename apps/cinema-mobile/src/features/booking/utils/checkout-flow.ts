import type { OrderApi } from "@/features/orders/services/order.service";
import type { CreateOrderPayload } from "@/features/orders/types/order.types";
import type { PaymentApi } from "@/features/payments/services/payment.service";
import type { PaymentMethod } from "@/features/payments/types/payment.types";
import type { PendingOrder } from "../types/pending-order.types";

export interface CheckoutInput {
  showtimeId: number;
  seatIds: number[];
  /** id món F&B → số lượng */
  combos: Record<string, number>;
  voucherCode?: string;
  /** Nhãn ghế để lưu cùng đơn */
  seatLabels: Record<number, string>;
  /** id phương thức trên giao diện */
  uiPaymentMethod: string;
  returnUrl?: string;
}

/** Chỉ liệt kê cổng backend đã hỗ trợ. */
const SUPPORTED_METHODS: Record<string, PaymentMethod> = { vnpay: "VNPAY" };

export const toBackendMethod = (ui: string): PaymentMethod | null =>
  SUPPORTED_METHODS[ui] ?? null;

export function buildOrderPayload(input: CheckoutInput): CreateOrderPayload {
  const fnbItems = Object.entries(input.combos)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => ({ fnbItemId: Number(id), quantity: qty }));

  const payload: CreateOrderPayload = {
    showtimeId: input.showtimeId,
    seatIds: input.seatIds,
    channel: "ONLINE_APP",
  };
  if (fnbItems.length > 0) payload.fnbItems = fnbItems;
  if (input.voucherCode) payload.voucherCode = input.voucherCode;
  return payload;
}

export function cartSignature(input: CheckoutInput): string {
  const seats = [...input.seatIds].sort((a, b) => a - b);
  const combos = Object.entries(input.combos)
    .filter(([, q]) => q > 0)
    .sort(([a], [b]) => Number(a) - Number(b));
  return JSON.stringify({
    s: input.showtimeId,
    seats,
    combos,
    v: input.voucherCode ?? "",
  });
}

export interface CheckoutDeps {
  orders: Pick<OrderApi, "createOrder" | "cancelOrder">;
  payments: PaymentApi;
  now: () => number;
  pending: PendingOrder | null;
  savePending: (order: PendingOrder) => void;
  clearPending: () => void;
}

export type CheckoutResult =
  | { ok: true; paymentUrl: string; orderId: number; reused: boolean }
  | { ok: false; message: string };

const errorMessage = (e: unknown, fb: string) =>
  e instanceof Error && e.message ? e.message : fb;

/**
 * Tạo đơn (hoặc dùng lại đơn PENDING còn hạn cùng giỏ) rồi khởi tạo thanh toán.
 * Không tự mở trình duyệt: trả paymentUrl cho nơi gọi.
 */
export async function startCheckoutFlow(
  input: CheckoutInput,
  deps: CheckoutDeps,
): Promise<CheckoutResult> {
  const method = toBackendMethod(input.uiPaymentMethod);
  if (!method) {
    return {
      ok: false,
      message:
        "Phương thức thanh toán này chưa được hỗ trợ. Vui lòng chọn VN Pay.",
    };
  }
  if (input.seatIds.length === 0 || !input.showtimeId) {
    return { ok: false, message: "Bạn chưa chọn ghế nào." };
  }

  const signature = cartSignature(input);
  let order: PendingOrder | null = null;
  let reused = false;

  const pending = deps.pending;
  if (
    pending &&
    pending.signature === signature &&
    pending.expiresAt > deps.now()
  ) {
    order = pending;
    reused = true;
  } else if (pending) {
    // Giỏ đã đổi hoặc đơn cũ hết hạn: hủy đơn cũ để nhả ghế.
    deps.clearPending();
    if (pending.expiresAt > deps.now()) {
      try {
        await deps.orders.cancelOrder(pending.orderId);
      } catch {
        // Đơn có thể đã bị hủy/hết hạn
      }
    }
  }

  if (!order) {
    try {
      const created = await deps.orders.createOrder(buildOrderPayload(input));
      order = {
        orderId: created.orderId,
        orderCode: created.orderCode,
        showtimeId: created.showtimeId,
        expiresAt: new Date(created.expiresAt).getTime(),
        signature,
        seatLabels: input.seatLabels,
      };
      deps.savePending(order);
    } catch (error) {
      return {
        ok: false,
        message: errorMessage(
          error,
          "Không thể tạo đơn hàng. Vui lòng thử lại.",
        ),
      };
    }
  }

  try {
    const session = await deps.payments.initiate({
      orderId: order.orderId,
      method,
      ...(input.returnUrl ? { returnUrl: input.returnUrl } : {}),
    });
    return {
      ok: true,
      paymentUrl: session.paymentUrl,
      orderId: order.orderId,
      reused,
    };
  } catch (error) {
    if (reused) deps.clearPending(); // đơn dùng lại có thể đã không còn hợp lệ ở server
    return {
      ok: false,
      message: errorMessage(
        error,
        "Không thể khởi tạo thanh toán. Vui lòng thử lại.",
      ),
    };
  }
}
