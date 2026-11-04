import { describe, expect, it, vi } from "vitest";

import {
  buildOrderPayload,
  cartSignature,
  startCheckoutFlow,
  type CheckoutDeps,
  type CheckoutInput,
} from "./checkout-flow";
import type { PendingOrder } from "./pending-order";

const input: CheckoutInput = {
  showtimeId: "7",
  seatIds: ["2", "1"],
  combos: { "5": 2, "6": 0 },
  uiPaymentMethod: "vnpay",
};

function deps(over: Partial<CheckoutDeps> = {}) {
  const d = {
    orders: {
      createOrder: vi.fn().mockResolvedValue({
        orderId: 10,
        orderCode: "ORD-10",
        showtimeId: 7,
        expiresAt: new Date(10_000).toISOString(),
      }),
      cancelOrder: vi.fn().mockResolvedValue({}),
    },
    payments: { initiate: vi.fn().mockResolvedValue({ paymentUrl: "https://pay/10" }) },
    now: () => 1_000,
    pending: null as PendingOrder | null,
    savePending: vi.fn(),
    clearPending: vi.fn(),
    ...over,
  };
  return d as typeof d & CheckoutDeps;
}

describe("buildOrderPayload / cartSignature", () => {
  it("chuyển id sang số, bỏ món số lượng 0", () => {
    expect(buildOrderPayload(input)).toEqual({
      showtimeId: 7,
      seatIds: [2, 1],
      channel: "ONLINE_WEB",
      fnbItems: [{ fnbItemId: 5, quantity: 2 }],
    });
  });

  it("chữ ký giỏ hàng không phụ thuộc thứ tự ghế, nhưng đổi khi đổi voucher", () => {
    expect(cartSignature(input)).toBe(cartSignature({ ...input, seatIds: ["1", "2"] }));
    expect(cartSignature(input)).not.toBe(cartSignature({ ...input, voucherCode: "SALE" }));
  });
});

describe("startCheckoutFlow", () => {
  it("phương thức chưa hỗ trợ => từ chối, không tạo đơn", async () => {
    const d = deps();
    const r = await startCheckoutFlow({ ...input, uiPaymentMethod: "momo" }, d);
    expect(r.ok).toBe(false);
    expect(d.orders.createOrder).not.toHaveBeenCalled();
  });

  it("tạo đơn mới, lưu đơn chờ thanh toán, trả về link thanh toán", async () => {
    const d = deps();
    const r = await startCheckoutFlow(input, d);

    expect(r).toEqual({ ok: true, paymentUrl: "https://pay/10", orderId: 10, reused: false });
    expect(d.savePending).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 10, signature: cartSignature(input), expiresAt: 10_000 }),
    );
    expect(d.payments.initiate).toHaveBeenCalledWith({ orderId: 10, method: "VNPAY" });
  });

  it("bấm thanh toán lần nữa với cùng giỏ hàng => dùng lại đơn còn hạn, KHÔNG tạo đơn thứ hai", async () => {
    const pending: PendingOrder = {
      orderId: 10,
      orderCode: "ORD-10",
      showtimeId: 7,
      expiresAt: 5_000,
      signature: cartSignature(input),
    };
    const d = deps({ pending });

    const r = await startCheckoutFlow(input, d);

    expect(r).toMatchObject({ ok: true, reused: true, orderId: 10 });
    expect(d.orders.createOrder).not.toHaveBeenCalled();
  });

  it("giỏ hàng đã đổi => hủy đơn cũ còn hạn (nhả ghế) rồi tạo đơn mới", async () => {
    const pending: PendingOrder = {
      orderId: 9,
      orderCode: "ORD-9",
      showtimeId: 7,
      expiresAt: 5_000,
      signature: "khac",
    };
    const d = deps({ pending });

    await startCheckoutFlow(input, d);

    expect(d.clearPending).toHaveBeenCalled();
    expect(d.orders.cancelOrder).toHaveBeenCalledWith(9);
    expect(d.orders.createOrder).toHaveBeenCalled();
  });

  it("khởi tạo thanh toán lỗi với đơn dùng lại => bỏ đơn đó để lần sau tạo mới", async () => {
    const pending: PendingOrder = {
      orderId: 10,
      orderCode: "ORD-10",
      showtimeId: 7,
      expiresAt: 5_000,
      signature: cartSignature(input),
    };
    const d = deps({ pending });
    vi.mocked(d.payments.initiate).mockRejectedValue(new Error("Đơn hàng đã hết hạn"));

    const r = await startCheckoutFlow(input, d);

    expect(r).toEqual({ ok: false, message: "Đơn hàng đã hết hạn" });
    expect(d.clearPending).toHaveBeenCalled();
  });
});
