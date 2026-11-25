import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";

import type { BackendClient } from "../lib/backend-client.js";
import { createOrderAndPayment, runTool } from "../tools/definitions.js";
import { effectsFor } from "../tools/tool-effects.js";
import { serializeToolResult } from "./nodes.js";
import { isPendingValid, type PendingOrder } from "./order-confirmation.js";

/**
 * Khách bấm nút trên thẻ xác nhận (ORDER_CONFIRMATION). Đường này KHÔNG đi qua mô hình:
 * code đọc đơn đang chờ trong state, kiểm tra confirmationId và hạn, rồi tạo đơn (hoặc hủy
 * bước xác nhận) – kết quả không phụ thuộc vào việc mô hình có làm đúng hay không.
 * Các bước được ghi vào lịch sử hội thoại để mô hình biết ở lượt sau.
 */

export interface OrderAction {
  type: "confirm_order" | "cancel_order";
  confirmationId: string;
}

export function parseOrderAction(raw: unknown): OrderAction | null {
  if (!raw || typeof raw !== "object") return null;
  const { type, confirmationId } = raw as Record<string, unknown>;
  if (type !== "confirm_order" && type !== "cancel_order") return null;
  if (typeof confirmationId !== "string" || !/^[A-Za-z0-9-]{8,64}$/.test(confirmationId)) return null;
  return { type, confirmationId };
}

export interface StatefulGraph {
  getState(options: unknown): Promise<{ values?: Record<string, any> }>;
  updateState(config: unknown, values: Record<string, unknown>, asNode?: string): Promise<unknown>;
}

type Send = (event: string, data: unknown) => void;

const CREATE_ORDER = createOrderAndPayment.name;

const vnd = (n: unknown) => `${Math.round(Number(n) || 0).toLocaleString("vi-VN")}đ`;
const vnTime = (iso: unknown) =>
  new Date(String(iso)).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });

export async function runOrderAction(opts: {
  graph: StatefulGraph;
  backend: BackendClient;
  threadId: string;
  token?: string;
  action: OrderAction;
  messageText: string;
  send: Send;
  now?: Date;
  signal?: AbortSignal;
}): Promise<void> {
  const { graph, threadId, action, send } = opts;
  const now = opts.now ?? new Date();
  const config = { configurable: { thread_id: threadId } };
  const snap = await graph.getState(config);
  const pending = (snap.values?.pendingOrder ?? null) as PendingOrder | null;
  const human = new HumanMessage(opts.messageText);

  const reply = async (text: string, values: Record<string, unknown> = {}) => {
    send("token", { text });
    // asNode "agent" + tin nhắn cuối là văn bản (không gọi tool) => lượt hội thoại kết thúc gọn
    await graph.updateState(config, { messages: [human, new AIMessage(text)], ...values }, "agent");
  };

  if (!opts.token) {
    send("ui_widget", {
      type: "LOGIN_REQUIRED",
      title: "Cần đăng nhập để tiếp tục",
      payload: { message: "Bạn cần đăng nhập để tạo đơn." },
    });
    await reply("Bạn cần đăng nhập để tạo đơn nhé.");
    return;
  }

  if (!isPendingValid(pending, now) || pending.confirmationId !== action.confirmationId) {
    await reply(
      "Thẻ xác nhận này không còn hiệu lực (đã hết hạn hoặc đơn đã thay đổi). Bạn nhắn lại để mình tạo thẻ xác nhận mới nhé.",
    );
    return;
  }

  if (action.type === "cancel_order") {
    await reply(
      "Mình đã hủy bước xác nhận, chưa có đơn nào được tạo. Ghế bạn đang giữ vẫn còn đến hết thời gian giữ – bạn muốn thay đổi gì?",
      { pendingOrder: null },
    );
    return;
  }

  // confirm_order: tạo đơn đúng với những gì khách đã thấy trên thẻ
  const callId = `confirm_${pending.confirmationId}`;
  send("tool_start", { name: CREATE_ORDER });
  const result = await runTool(CREATE_ORDER, pending.args, {
    backend: opts.backend,
    token: opts.token,
    signal: opts.signal,
  });
  send("tool_end", { name: CREATE_ORDER, ok: result.ok });

  const fx = effectsFor(CREATE_ORDER, pending.args as unknown as Record<string, unknown>, result);
  if (fx.widget) send("ui_widget", fx.widget);

  const data = (result.ok ? result.data : {}) as Record<string, any>;
  const text = result.ok
    ? `Đã tạo đơn ${data.orderCode}, tổng ${vnd(data.pricing?.finalAmount)}. Bạn bấm "Thanh toán VNPay" để thanh toán trước ${vnTime(data.expiresAt)} nhé.`
    : `Chưa tạo được đơn: ${(result as { message?: string }).message ?? "có lỗi xảy ra"}. Bạn thử lại hoặc nhắn để mình kiểm tra nhé.`;
  send("token", { text });

  await graph.updateState(
    config,
    {
      messages: [
        human,
        new AIMessage({
          content: "",
          tool_calls: [{ id: callId, name: CREATE_ORDER, args: pending.args as any, type: "tool_call" }],
        }),
        new ToolMessage({ content: serializeToolResult(result), tool_call_id: callId, name: CREATE_ORDER }),
        new AIMessage(text),
      ],
      ...fx.patch,
      ...(fx.widget ? { activeWidget: fx.widget } : {}),
      pendingOrder: result.ok ? null : pending,
    },
    "agent",
  );
}
