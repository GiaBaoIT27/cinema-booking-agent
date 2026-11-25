import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";

import {
  decideOrderCall,
  isConfirmationText,
  sameOrderArgs,
  type PendingOrder,
} from "../src/graph/order-confirmation.js";
import { buildAgentGraph } from "../src/graph/agent-graph.js";
import { runOrderAction, parseOrderAction } from "../src/graph/order-actions.js";
import { createBackendClient } from "../src/lib/backend-client.js";
import { startFakeBackend } from "./helpers.js";

/* ───────────── Quy tắc thuần ───────────── */

test("isConfirmationText: câu xác nhận rõ ràng (có/không dấu), từ chối khi có phủ định hoặc đổi ý", () => {
  for (const t of [
    "Tôi xác nhận thông tin đơn hàng, hãy tạo link thanh toán VNPay",
    "xac nhan",
    "Đồng ý",
    "ok chốt đơn",
    "Tôi xác nhận thanh toán vé phim",
  ]) assert.equal(isConfirmationText(t), true, t);
  for (const t of [
    "Khoan đã, đổi sang ghế H8",
    "Không, tôi chưa muốn đặt",
    "Hủy giúp tôi",
    "Combo Solo giá bao nhiêu?",
    "xác nhận nhưng đổi voucher khác",
  ]) assert.equal(isConfirmationText(t), false, t);
});

test("sameOrderArgs: bỏ qua thứ tự ghế/bắp nước, hoa thường của ghế và voucher", () => {
  assert.equal(
    sameOrderArgs(
      { showtimeId: 897, seatLabels: ["h8", "H7"], fnbItems: [{ fnbItemId: 3, quantity: 1 }, { fnbItemId: 2, quantity: 1 }], voucherCode: "voucher10" },
      { showtimeId: 897, seatLabels: ["H7", "H8"], fnbItems: [{ fnbItemId: 2, quantity: 1 }, { fnbItemId: 3, quantity: 1 }], voucherCode: " VOUCHER10 " },
    ),
    true,
  );
  assert.equal(sameOrderArgs({ showtimeId: 897, seatLabels: ["H7"] }, { showtimeId: 897, seatLabels: ["H8"] }), false);
});

const NOW = new Date("2026-11-25T03:00:00Z");
const args = { showtimeId: 897, seatLabels: ["H7"] };
const pending = (over: Partial<PendingOrder> = {}): PendingOrder => ({
  confirmationId: "c1c1c1c1-0000-4000-8000-000000000000",
  args,
  summary: {},
  shownAt: 2,
  expiresAt: new Date(NOW.getTime() + 60_000).toISOString(),
  ...over,
});

test("decideOrderCall: chỉ tạo đơn khi khách xác nhận SAU khi thẻ hiện ra, đúng đơn, còn hạn", () => {
  const history = [new HumanMessage("Giữ H7 và tạo đơn"), new AIMessage("Tổng 65.000đ, bạn xác nhận nhé?")];
  assert.equal(decideOrderCall(null, args, history, NOW), "preview");
  assert.equal(decideOrderCall(pending(), args, history, NOW), "preview");
  const confirmed = [...history, new HumanMessage("Tôi xác nhận")];
  assert.equal(decideOrderCall(pending(), args, confirmed, NOW), "create");
  assert.equal(decideOrderCall(pending(), { showtimeId: 897, seatLabels: ["H8"] }, confirmed, NOW), "preview");
  assert.equal(
    decideOrderCall(pending({ expiresAt: new Date(NOW.getTime() - 1).toISOString() }), args, confirmed, NOW),
    "preview",
  );
  assert.equal(decideOrderCall(pending(), args, [...history, new HumanMessage("Khoan, đổi ghế")], NOW), "preview");
});

test("parseOrderAction: chỉ nhận đúng kiểu và confirmationId hợp lệ", () => {
  assert.deepEqual(parseOrderAction({ type: "confirm_order", confirmationId: "abcdef12-3456" }), {
    type: "confirm_order",
    confirmationId: "abcdef12-3456",
  });
  assert.equal(parseOrderAction({ type: "pay", confirmationId: "abcdef12-3456" }), null);
  assert.equal(parseOrderAction({ type: "confirm_order", confirmationId: "x OR 1=1" }), null);
  assert.equal(parseOrderAction(undefined), null);
});

/* ───────────── Luồng trên đồ thị LangGraph thật ───────────── */

let be: Awaited<ReturnType<typeof startFakeBackend>>;
before(async () => (be = await startFakeBackend()));
after(() => be.close());

/** Mô hình giả: lượt lẻ gọi create_order_and_payment (cùng tham số), lượt chẵn trả lời văn bản */
function scriptedModel() {
  let step = 0;
  return {
    invoke: async () => {
      step += 1;
      return step % 2 === 1
        ? new AIMessage({
            content: "",
            tool_calls: [{ id: `c${step}`, name: "create_order_and_payment", args: { showtimeId: 897, seatLabels: ["H7"] } }],
          })
        : new AIMessage({ content: "Xong." });
    },
  };
}

const orderPosts = () => be.calls.filter((c) => c.url === "/orders" && c.method === "POST").length;

test("đồ thị: lần đầu chỉ xem trước (thẻ ORDER_CONFIRMATION, không POST /orders); khách xác nhận => tạo đơn", async () => {
  be.calls.length = 0;
  const backend = createBackendClient({ baseUrl: be.url });
  const graph = buildAgentGraph({ model: scriptedModel(), backend, checkpointer: new MemorySaver() });
  const cfg = { configurable: { thread_id: "t1", authToken: "good" } };

  // "xác nhận" ngay tin nhắn đầu – khách CHƯA thấy tổng tiền => vẫn chỉ xem trước
  await graph.invoke({ messages: [new HumanMessage("Tôi xác nhận, tạo đơn H7 giúp tôi")] }, cfg);
  let state = await graph.getState(cfg);
  assert.equal(orderPosts(), 0);
  assert.equal(state.values.activeWidget.type, "ORDER_CONFIRMATION");
  assert.equal(state.values.activeWidget.payload.pricing.finalAmount, 65000);
  assert.ok(state.values.pendingOrder?.confirmationId);

  // Khách xác nhận sau khi thấy thẻ => tạo đơn thật
  await graph.invoke({ messages: [new HumanMessage("Tôi xác nhận")] }, cfg);
  state = await graph.getState(cfg);
  assert.equal(orderPosts(), 1);
  assert.equal(state.values.activeWidget.type, "PAYMENT_SUMMARY");
  assert.equal(state.values.pendingOrder, null);
});

test("nút Xác nhận: tạo đơn không qua mô hình; confirmationId sai hoặc bấm lại thì không tạo thêm đơn", async () => {
  be.calls.length = 0;
  const backend = createBackendClient({ baseUrl: be.url });
  const graph = buildAgentGraph({ model: scriptedModel(), backend, checkpointer: new MemorySaver() });
  const cfg = { configurable: { thread_id: "t2", authToken: "good" } };
  await graph.invoke({ messages: [new HumanMessage("Tạo đơn H7")] }, cfg);
  const pend = (await graph.getState(cfg)).values.pendingOrder as PendingOrder;
  const events: Array<[string, any]> = [];
  const send = (e: string, d: unknown) => events.push([e, d]);
  const base = { graph: graph as any, backend, threadId: "t2", token: "good", send };

  await runOrderAction({
    ...base,
    action: { type: "confirm_order", confirmationId: "ffffffff-0000-4000-8000-000000000000" },
    messageText: "Xác nhận đặt vé",
  });
  assert.equal(orderPosts(), 0);

  await runOrderAction({ ...base, action: { type: "confirm_order", confirmationId: pend.confirmationId }, messageText: "Xác nhận đặt vé" });
  assert.equal(orderPosts(), 1);
  assert.ok(events.some(([e, d]) => e === "ui_widget" && d.type === "PAYMENT_SUMMARY"));
  const after1 = await graph.getState(cfg);
  assert.equal(after1.values.pendingOrder, null);
  assert.equal(after1.values.orderId, 14);
  assert.equal(after1.values.messages.at(-2).name, "create_order_and_payment");
  // Không để đồ thị dừng giữa chừng: tin nhắn tiếp theo của khách chạy bình thường
  assert.deepEqual(after1.next, []);
  await graph.invoke({ messages: [new HumanMessage("Cảm ơn bạn")] }, cfg);

  await runOrderAction({ ...base, action: { type: "confirm_order", confirmationId: pend.confirmationId }, messageText: "Xác nhận đặt vé" });
  assert.equal(orderPosts(), 1);
});

test("nút Hủy: xóa đơn chờ xác nhận, không gọi backend tạo đơn", async () => {
  be.calls.length = 0;
  const backend = createBackendClient({ baseUrl: be.url });
  const graph = buildAgentGraph({ model: scriptedModel(), backend, checkpointer: new MemorySaver() });
  const cfg = { configurable: { thread_id: "t3", authToken: "good" } };
  await graph.invoke({ messages: [new HumanMessage("Tạo đơn H7")] }, cfg);
  const pend = (await graph.getState(cfg)).values.pendingOrder as PendingOrder;

  await runOrderAction({
    graph: graph as any,
    backend,
    threadId: "t3",
    token: "good",
    send: () => undefined,
    action: { type: "cancel_order", confirmationId: pend.confirmationId },
    messageText: "Hủy",
  });
  assert.equal(orderPosts(), 0);
  assert.equal((await graph.getState(cfg)).values.pendingOrder, null);
});
