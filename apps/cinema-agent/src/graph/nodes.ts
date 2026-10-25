import { SystemMessage, ToolMessage } from "@langchain/core/messages";
import type { BackendClient } from "../lib/backend-client.js";
import { runTool, type ToolResult } from "../tools/definitions.js";
import { effectsFor } from "../tools/tool-effects.js";
import { buildSystemPrompt } from "./prompt.js";
import { windowMessages } from "./messages.js";
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
}

type NodeState = BookingSession & { messages: any[] };

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
    const prompt = new SystemMessage(buildSystemPrompt(state, loggedIn));
    // Truyền config để token của mô hình được stream ra ngoài theo thời gian thực
    const response = await deps.model.invoke([prompt, ...history], config);
    return { messages: [response] };
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
    let patch: SessionPatch = {};
    let widget: GenerativeUIWidget | null = null;

    for (const call of calls) {
      const result = await runTool(call.name, call.args, ctx);
      messages.push(
        new ToolMessage({
          content: serializeToolResult(result),
          tool_call_id: call.id ?? call.name,
          name: call.name,
        }),
      );
      const fx = effectsFor(
        call.name,
        (call.args ?? {}) as Record<string, unknown>,
        result,
      );
      patch = { ...patch, ...fx.patch };
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
