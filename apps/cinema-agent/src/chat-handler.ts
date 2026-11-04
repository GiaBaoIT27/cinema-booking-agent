import { createHash, randomUUID } from "node:crypto";
import { HumanMessage } from "@langchain/core/messages";
import type { AgentConfig } from "./config.js";
import { extractBearer, readAuth } from "./lib/jwt.js";
import type { RateLimiter } from "./lib/rate-limit.js";
import { pipeAgentStream, type SendEvent } from "./stream/pipe-stream.js";

/** Phần của Express Response mà handler cần (giúp kiểm thử không cần Express) */
export interface ChatResponse {
  writableEnded: boolean;
  status(code: number): ChatResponse;
  json(body: unknown): unknown;
  setHeader(name: string, value: string | number): unknown;
  flushHeaders(): void;
  write(chunk: string): unknown;
  end(): void;
  on(event: "close", cb: () => void): unknown;
}

export interface ChatRequest {
  body: unknown;
  authorization?: string;
  ip?: string;
}

export interface GraphLike {
  stream(input: unknown, options: unknown): Promise<AsyncIterable<unknown>>;
  getState(options: unknown): Promise<{ values?: Record<string, any> }>;
}

export interface ChatDeps {
  config: AgentConfig;
  graph: GraphLike;
  limiter: RateLimiter;
  log?: (msg: string, err?: unknown) => void;
}

const SESSION_ID = /^[A-Za-z0-9_-]{8,64}$/;
const HEARTBEAT_MS = 15_000;
const RECURSION_LIMIT = 14;

/** Hết quota theo NGÀY của nhà cung cấp LLM – thử lại trong vài phút cũng vô ích. */
const LLM_DAILY_QUOTA = /per ?day|PerDay|daily/i;
/** LLM quá tải / bị giới hạn tốc độ tạm thời – có thể thử lại sau. */
const LLM_TRANSIENT =
  /\b429\b|\b503\b|quota|rate.?limit|too many requests|resource.?exhausted|overloaded|unavailable/i;

/**
 * Phân loại lỗi agent thành mã máy đọc được + câu thông báo an toàn cho người dùng.
 * KHÔNG đưa message gốc ra ngoài (có thể chứa URL API, thông tin quota, key...).
 */
export function classifyAgentError(error: unknown): {
  code: string;
  message: string;
} {
  if ((error as { name?: string })?.name === "GraphRecursionError") {
    return {
      code: "TOO_MANY_STEPS",
      message: "Yêu cầu này cần quá nhiều bước, bạn thử chia nhỏ giúp mình nhé.",
    };
  }
  const raw = String((error as Error)?.message ?? error ?? "");
  if (LLM_TRANSIENT.test(raw)) {
    return LLM_DAILY_QUOTA.test(raw)
      ? {
          code: "LLM_QUOTA_EXHAUSTED",
          message: "Trợ lý tạm thời ngừng phục vụ do quá tải, vui lòng quay lại sau.",
        }
      : {
          code: "LLM_UNAVAILABLE",
          message: "Trợ lý đang quá tải, vui lòng thử lại sau ít phút.",
        };
  }
  return {
    code: "AGENT_ERROR",
    message: "Trợ lý đang gặp sự cố, vui lòng thử lại sau.",
  };
}

/** Mã định danh luồng hội thoại: gắn với người dùng nên không thể đọc phiên của người khác */
export function threadIdFor(
  userId: string | undefined,
  sessionId: string,
): string {
  return createHash("sha256")
    .update(`${userId ?? "anon"}:${sessionId}`)
    .digest("hex");
}

export async function handleChat(
  deps: ChatDeps,
  req: ChatRequest,
  res: ChatResponse,
): Promise<void> {
  const { config } = deps;
  const log = deps.log ?? (() => undefined);

  const body = (
    req.body && typeof req.body === "object" ? req.body : {}
  ) as Record<string, unknown>;
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    res.status(400).json({ error: "Trường message là bắt buộc." });
    return;
  }
  if (message.length > config.maxMessageChars) {
    res
      .status(400)
      .json({ error: `Tin nhắn tối đa ${config.maxMessageChars} ký tự.` });
    return;
  }

  const token = extractBearer(req.authorization);
  const auth = readAuth(token, config.jwtSecret);
  if (token && !auth) {
    res.status(401).json({ error: "Token không hợp lệ hoặc đã hết hạn." });
    return;
  }

  if (!deps.limiter.allow(auth?.userId ?? `ip:${req.ip ?? "unknown"}`)) {
    res.setHeader("Retry-After", 60);
    res
      .status(429)
      .json({ error: "Bạn gửi quá nhanh, vui lòng thử lại sau ít phút." });
    return;
  }

  const sessionId =
    typeof body.sessionId === "string" && SESSION_ID.test(body.sessionId)
      ? body.sessionId
      : randomUUID();
  const threadId = threadIdFor(auth?.userId, sessionId);

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send: SendEvent = (event, data) => {
    if (!res.writableEnded)
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const abort = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) abort.abort();
  });
  const heartbeat = setInterval(() => {
    if (!res.writableEnded) res.write(": ping\n\n");
  }, HEARTBEAT_MS);

  try {
    send("session", { sessionId });

    const stream = await deps.graph.stream(
      { messages: [new HumanMessage(message)] },
      {
        configurable: { thread_id: threadId, authToken: token },
        streamMode: ["messages", "updates"],
        signal: abort.signal,
        recursionLimit: RECURSION_LIMIT,
      },
    );
    await pipeAgentStream(stream, send);

    const snapshot = await deps.graph.getState({
      configurable: { thread_id: threadId },
    });
    const v = snapshot.values ?? {};
    send("state_sync", {
      sessionId,
      movieId: v.movieId ?? null,
      movieTitle: v.movieTitle ?? null,
      showtimeId: v.showtimeId ?? null,
      selectedSeats: v.selectedSeats ?? [],
      holdExpiresAt: v.holdExpiresAt ?? null,
      orderId: v.orderId ?? null,
    });
    send("end", { status: "COMPLETED" });
  } catch (error) {
    if (!abort.signal.aborted) {
      log("Agent error", error);
      // Chỉ gửi MÃ lỗi đã phân loại + câu thông báo chung cho client; chi tiết lỗi gốc
      // (URL API, quota, stack...) chỉ nằm trong log server.
      send("error", classifyAgentError(error));
      send("end", { status: "FAILED" });
    }
  } finally {
    clearInterval(heartbeat);
    if (!res.writableEnded) res.end();
  }
}
