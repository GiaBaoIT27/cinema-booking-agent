// `expo/fetch` hỗ trợ đọc phản hồi dạng stream (fetch mặc định của React Native thì không).
import { fetch as expoFetch } from "expo/fetch";
import { AGENT_URL } from "../config";
import type { AgentEvent } from "../types/agent.types";
import { parseSse } from "../utils/sse-parser";

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
  token?: string | null;
  signal?: AbortSignal;
}

const KNOWN_EVENTS = new Set([
  "session",
  "token",
  "tool_start",
  "tool_end",
  "ui_widget",
  "state_sync",
  "error",
  "end",
]);

/** Gửi tin nhắn tới agent và trả từng sự kiện ngay khi server phát ra. */
export async function* streamAgentChat(
  params: StreamChatParams,
): AsyncGenerator<AgentEvent> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  if (params.token) headers.Authorization = `Bearer ${params.token}`;

  let res: Awaited<ReturnType<typeof expoFetch>>;
  try {
    res = await expoFetch(`${AGENT_URL}/api/v1/agent/chat/stream`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        message: params.message,
        sessionId: params.sessionId,
      }),
      signal: params.signal,
    });
  } catch (e) {
    if ((e as { name?: string })?.name === "AbortError") throw e;
    throw new AgentHttpError(
      0,
      "Không kết nối được tới trợ lý AI. Kiểm tra mạng và địa chỉ agent rồi thử lại.",
    );
  }

  if (!res.ok || !res.body) {
    let message = "Trợ lý AI đang gặp sự cố, vui lòng thử lại.";
    if (res.status === 401)
      message = "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.";
    else if (res.status === 429)
      message = "Bạn gửi quá nhanh, vui lòng thử lại sau ít phút.";
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

  for await (const raw of parseSse(
    res.body as unknown as ReadableStream<Uint8Array>,
  )) {
    if (!KNOWN_EVENTS.has(raw.event)) continue;
    try {
      yield { event: raw.event, data: JSON.parse(raw.data) } as AgentEvent;
    } catch {
      // Bỏ qua khung dữ liệu hỏng
    }
  }
}
