import { randomUUID } from "node:crypto";
import { AIMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import type { BackendClient } from "../lib/backend-client.js";
import {
  createOrderAndPayment,
  previewOrder,
  runTool,
  type ToolResult,
} from "../tools/definitions.js";
import { effectsFor, orderConfirmationWidget } from "../tools/tool-effects.js";
import {
  decideOrderCall,
  PENDING_ORDER_TTL_MS,
  type PendingOrder,
} from "./order-confirmation.js";
import { buildSystemPrompt } from "./prompt.js";
import { windowMessages } from "./messages.js";
import {
  fallbackProposal,
  findUnconfirmedHolds,
  guardInstruction,
} from "./seat-choice-guard.js";
import type {
  BookingSession,
  GenerativeUIWidget,
  SessionPatch,
} from "../types/session.js";

/** Phần cần dùng của một chat model đã bindTools */
export interface ModelLike {
  invoke(messages: unknown[], config?: unknown): Promise<any>;
}

export interface NodeConfig {
  configurable?: { authToken?: string; [k: string]: unknown };
  signal?: AbortSignal;
  [k: string]: unknown;
}

export interface NodeDeps {
  model: ModelLike;
  backend: BackendClient;
  maxHistory?: number;
  /** Mặc định bật. */
  seatChoiceGuard?: boolean;
  /** Đồng hồ (thay được trong test) */
  now?: () => Date;
}

type NodeState = BookingSession & {
  messages: any[];
  pendingOrder?: PendingOrder | null;
};

const CREATE_ORDER = createOrderAndPayment.name;

const MAX_TOOL_CONTENT = 12_000;

export function serializeToolResult(result: ToolResult): string {
  const text = JSON.stringify(
    result.ok ? { ok: true, data: result.data } : result,
  );
  return text.length > MAX_TOOL_CONTENT
    ? JSON.stringify({
        ok: false,
        errorCode: "RESULT_TOO_LARGE",
        message:
          "Kết quả quá dài, hãy thu hẹp yêu cầu (ví dụ chọn một rạp hoặc một ngày).",
      })
    : text;
}

export function createAgentNode(deps: NodeDeps) {
  return async (state: NodeState, config: NodeConfig) => {
    const loggedIn = Boolean(config?.configurable?.authToken);
    const history = windowMessages(state.messages, deps.maxHistory ?? 40);
    const systemPrompt = buildSystemPrompt(state, loggedIn);
    // Truyền config để token của mô hình được stream ra ngoài theo thời gian thực
    const response = await deps.model.invoke(
      [new SystemMessage(systemPrompt), ...history],
      config,
    );

    // Chốt chặn: không giữ ghế khách chưa chọn (seat-choice-guard.ts). Xét trên TOÀN BỘ
    // hội thoại, không chỉ cửa sổ gửi cho mô hình.
    const blocked =
      deps.seatChoiceGuard === false
        ? []
        : findUnconfirmedHolds(response?.tool_calls, state.messages);
    if (blocked.length === 0) return { messages: [response] };

    // Hỏi lại mô hình một lần với chỉ dẫn của chốt chặn (đặt trong system prompt vì
    // Gemini chỉ nhận system message ở đầu hội thoại)
    let retry = await deps.model.invoke(
      [new SystemMessage(`${systemPrompt}\n\n${guardInstruction(blocked)}`), ...history],
      config,
    );
    const stillBlocked = findUnconfirmedHolds(retry?.tool_calls, state.messages);
    if (stillBlocked.length > 0) {
      const blockedIds = new Set(stillBlocked.map((b) => b.callId));
      const remaining = (retry.tool_calls ?? []).filter(
        (c: { id?: string; name: string }) => !(c.name === "hold_seats" && blockedIds.has(c.id)),
      );
      const text = typeof retry.content === "string" ? retry.content.trim() : "";
      retry = new AIMessage({
        content: text || fallbackProposal(stillBlocked),
        tool_calls: remaining,
      });
    }
    return {
      messages: [retry],
      guardBlocked: [...blocked, ...stillBlocked].map((b) => ({ seats: b.seats })),
    };
  };
}

export function createToolsNode(deps: NodeDeps) {
  return async (state: NodeState, config: NodeConfig) => {
    const last = state.messages[state.messages.length - 1];
    const calls: Array<{ id?: string; name: string; args: unknown }> =
      last?.tool_calls ?? [];
    const ctx = {
      backend: deps.backend,
      token: config?.configurable?.authToken,
      signal: config?.signal,
    };

    const messages: ToolMessage[] = [];
    let patch: SessionPatch & { pendingOrder?: PendingOrder | null } = {};
    let widget: GenerativeUIWidget | null = null;

    for (const call of calls) {
      const push = (result: ToolResult) =>
        messages.push(
          new ToolMessage({
            content: serializeToolResult(result),
            tool_call_id: call.id ?? call.name,
            name: call.name,
          }),
        );

      // Xác nhận trước khi tạo đơn (order-confirmation.ts): chưa đủ điều kiện thì CHỈ xem
      // trước giá và hiện thẻ xác nhận – không tạo đơn, không gắn ghế.
      if (call.name === CREATE_ORDER && ctx.token) {
        const parsed = createOrderAndPayment.schema.safeParse(call.args ?? {});
        if (parsed.success) {
          const now = deps.now?.() ?? new Date();
          const decision = decideOrderCall(
            state.pendingOrder,
            parsed.data,
            state.messages,
            now,
          );
          if (decision === "preview") {
            const result = await previewOrder(parsed.data, ctx);
            push(result);
            if (result.ok) {
              const pending: PendingOrder = {
                confirmationId: randomUUID(),
                args: parsed.data,
                summary: result.data as Record<string, unknown>,
                shownAt: state.messages.length,
                expiresAt: new Date(now.getTime() + PENDING_ORDER_TTL_MS).toISOString(),
              };
              patch = { ...patch, pendingOrder: pending };
              widget = orderConfirmationWidget(pending, state.movieTitle ?? null);
            }
            continue;
          }
        }
      }

      const result = await runTool(call.name, call.args, ctx);
      push(result);
      const fx = effectsFor(
        call.name,
        (call.args ?? {}) as Record<string, unknown>,
        result,
      );
      patch = { ...patch, ...fx.patch };
      if (call.name === CREATE_ORDER && result.ok) patch.pendingOrder = null;
      if (fx.widget) widget = fx.widget;
    }

    // Chỉ gửi activeWidget khi vòng này thực sự tạo widget mới
    return { messages, ...patch, ...(widget ? { activeWidget: widget } : {}) };
  };
}

export function routeAfterAgent(state: { messages: any[] }): "tools" | "end" {
  const last = state.messages[state.messages.length - 1];
  return last?.tool_calls?.length > 0 ? "tools" : "end";
}
