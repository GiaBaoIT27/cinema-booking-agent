import type { AgentEvent } from "../types/agent.type";
import { parseSse } from "../utils/sse-parser";

/** Địa chỉ cinema-agent. Đặt NEXT_PUBLIC_AGENT_URL trong .env.local khi triển khai */
export const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:3002";

export class AgentHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AgentHttpError";
  }
}

export interface StreamChatParams {
  message: string;
  sessionId?: string;
  token?: string;
  signal?: AbortSignal;
}

const KNOWN_EVENTS = new Set(["session", "token", "tool_start", "tool_end", "ui_widget", "state_sync", "error", "end"]);

/** Gửi tin nhắn tới agent và trả từng sự kiện ngay khi server phát ra */
export async function* streamAgentChat(params: StreamChatParams, fetchImpl: typeof fetch = fetch): AsyncGenerator<AgentEvent> {
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "text/event-stream" };
  if (params.token) headers.Authorization = `Bearer ${params.token}`;

  let res: Response;
  try {
    res = await fetchImpl(`${AGENT_URL}/api/v1/agent/chat/stream`, {
      method: "POST",
      headers,
      body: JSON.stringify({ message: params.message, sessionId: params.sessionId }),
      signal: params.signal,
    });
  } catch (e) {
    if ((e as { name?: string })?.name === "AbortError") throw e;
    throw new AgentHttpError(0, "Không kết nối được tới trợ lý AI. Vui lòng thử lại sau.");
  }

  if (!res.ok || !res.body) {
    let message = "Trợ lý AI đang gặp sự cố, vui lòng thử lại.";
    if (res.status === 401) message = "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.";
    else if (res.status === 429) message = "Bạn gửi quá nhanh, vui lòng thử lại sau ít phút.";
    else {
      try {
        const body = (await res.json()) as { error?: string };
        if (body?.error) message = body.error;
      } catch {
        // Giữ thông báo mặc định
      }
    }
    throw new AgentHttpError(res.status, message);
  }

  for await (const raw of parseSse(res.body)) {
    if (!KNOWN_EVENTS.has(raw.event)) continue;
    try {
      yield { event: raw.event, data: JSON.parse(raw.data) } as AgentEvent;
    } catch {
      // Bỏ qua khung dữ liệu hỏng
    }
  }
}
