import type { OrderApi } from "@/features/orders/services/order.service";
import type { PaymentApi } from "@/features/payments/services/payment.service";
import type { CreateOrderPayload } from "@/features/orders/types/order.type";
import type { PaymentMethod } from "@/features/payments/types/payment.type";
import type { PendingOrder } from "./pending-order";

export interface CheckoutInput {
  showtimeId: string;
  seatIds: string[];
  /** id món F&B → số lượng */
  combos: Record<string, number>;
  voucherCode?: string;
  /** id phương thức trên giao diện: vnpay, momo, ... */
  uiPaymentMethod: string;
}

/** Phương thức giao diện → enum backend. Chỉ liệt kê cổng đã được backend hỗ trợ */
const SUPPORTED_METHODS: Record<string, PaymentMethod> = {
  vnpay: "VNPAY",
};

export function toBackendMethod(uiMethod: string): PaymentMethod | null {
  return SUPPORTED_METHODS[uiMethod] ?? null;
}

export function buildOrderPayload(input: CheckoutInput): CreateOrderPayload {
  const fnbItems = Object.entries(input.combos)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => ({ fnbItemId: Number(id), quantity: qty }));

  const payload: CreateOrderPayload = {
    showtimeId: Number(input.showtimeId),
    seatIds: input.seatIds.map(Number),
    channel: "ONLINE_WEB",
  };
  if (fnbItems.length > 0) payload.fnbItems = fnbItems;
  if (input.voucherCode) payload.voucherCode = input.voucherCode;
  return payload;
}

/** Chữ ký nội dung giỏ hàng: ghế, món, voucher thay đổi thì chữ ký đổi */
export function cartSignature(input: CheckoutInput): string {
  const seats = [...input.seatIds].map(Number).sort((a, b) => a - b);
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

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * Tạo đơn (hoặc dùng lại đơn PENDING còn hạn có cùng giỏ hàng) rồi khởi tạo
 * thanh toán. Không tự chuyển trang: trả về paymentUrl cho nơi gọi.
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
    // Giỏ hàng đã đổi hoặc đơn cũ hết hạn → hủy đơn cũ để nhả ghế/không để rác
    deps.clearPending();
    if (pending.expiresAt > deps.now()) {
      try {
        await deps.orders.cancelOrder(pending.orderId);
      } catch {
        // Đơn có thể đã bị hủy/hết hạn, bỏ qua
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
    });
    return {
      ok: true,
      paymentUrl: session.paymentUrl,
      orderId: order.orderId,
      reused,
    };
  } catch (error) {
    if (reused) {
      // Đơn dùng lại có thể đã không còn hợp lệ ở server → bỏ để lần sau tạo mới
      deps.clearPending();
    }
    return {
      ok: false,
      message: errorMessage(
        error,
        "Không thể khởi tạo thanh toán. Vui lòng thử lại.",
      ),
    };
  }
}
