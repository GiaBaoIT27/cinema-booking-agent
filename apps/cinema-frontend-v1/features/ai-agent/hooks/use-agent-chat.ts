"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "../types/agent.type";
import { AgentHttpError, streamAgentChat } from "../services/agent.service";
import { getAgentAuthToken } from "../utils/auth-token";
import { applyAgentEvent, newAgentMessage, newUserMessage, nowLabel } from "../utils/chat-reducer";

const STORAGE_KEY = "cinema_agent_chat_v1";
const MAX_STORED = 60;

const GREETING: ChatMessage = {
  id: "greeting",
  sender: "agent",
  text: "Xin chào! Mình là trợ lý AI đặt vé. Bạn muốn xem phim gì, ở rạp nào, hay cần mình gợi ý suất chiếu phù hợp?",
  timestamp: nowLabel(),
  widgets: [],
  status: null,
  error: null,
};

interface Persisted {
  messages: ChatMessage[];
  sessionId?: string;
}

function loadPersisted(): Persisted | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Persisted;
    return Array.isArray(data.messages) && data.messages.length > 0 ? data : null;
  } catch {
    return null;
  }
}

let counter = 0;
const uid = (prefix: string) => `${prefix}-${Date.now()}-${counter++}`;

/** Quản lý hội thoại với cinema-agent: gửi tin, nhận stream, giữ phiên qua lần tải lại trang */
export function useAgentChat() {
  const [initial] = useState<Persisted | null>(loadPersisted);
  const [messages, setMessages] = useState<ChatMessage[]>(initial?.messages ?? [GREETING]);
  const [isStreaming, setIsStreaming] = useState(false);
  const sessionIdRef = useRef<string | undefined>(initial?.sessionId);
  const abortRef = useRef<AbortController | null>(null);
  const streamingRef = useRef(false);

  // Lưu hội thoại (không lưu giữa chừng khi đang stream)
  useEffect(() => {
    if (isStreaming) return;
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ messages: messages.slice(-MAX_STORED), sessionId: sessionIdRef.current }),
      );
    } catch {
      // Bỏ qua lỗi storage
    }
  }, [messages, isStreaming]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const send = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text || streamingRef.current) return;
    streamingRef.current = true;
    setIsStreaming(true);

    const agentId = uid("agent");
    setMessages((prev) => [...prev, newUserMessage(text, uid("user")), newAgentMessage(agentId)]);

    const controller = new AbortController();
    abortRef.current = controller;
    let gotEnd = false;

    try {
      for await (const ev of streamAgentChat({
        message: text,
        sessionId: sessionIdRef.current,
        token: getAgentAuthToken(),
        signal: controller.signal,
      })) {
        if (ev.event === "session") sessionIdRef.current = ev.data.sessionId;
        if (ev.event === "end") gotEnd = true;
        setMessages((prev) => applyAgentEvent(prev, agentId, ev));
      }
      if (!gotEnd) {
        setMessages((prev) =>
          applyAgentEvent(prev, agentId, {
            event: "error",
            data: { code: "STREAM_CLOSED", message: "Kết nối bị ngắt giữa chừng, bạn thử gửi lại nhé." },
          }),
        );
      }
    } catch (e) {
      const aborted = (e as { name?: string })?.name === "AbortError";
      const message = aborted
        ? "Đã dừng."
        : e instanceof AgentHttpError
          ? e.message
          : "Có lỗi xảy ra, vui lòng thử lại.";
      setMessages((prev) =>
        applyAgentEvent(prev, agentId, { event: "error", data: { code: aborted ? "ABORTED" : "CLIENT_ERROR", message } }),
      );
    } finally {
      abortRef.current = null;
      streamingRef.current = false;
      setIsStreaming(false);
    }
  }, []);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  /** Bắt đầu cuộc trò chuyện mới (agent cũng quên ngữ cảnh cũ) */
  const reset = useCallback(() => {
    abortRef.current?.abort();
    sessionIdRef.current = undefined;
    setMessages([{ ...GREETING, timestamp: nowLabel() }]);
  }, []);

  return { messages, isStreaming, send, stop, reset };
}
