import { useCallback, useEffect, useRef, useState } from "react";
import { tokenStorage } from "@/lib/token-storage";
import { useAgentChatStore } from "@/store/agent-chat.store";
import { useAuthStore } from "@/store/auth.store";
import { AgentHttpError, streamAgentChat } from "../services/agent.service";
import {
  applyAgentEvent,
  newAgentMessage,
  newUserMessage,
} from "../utils/chat-reducer";

let counter = 0;
const uid = (prefix: string) => `${prefix}-${Date.now()}-${counter++}`;

/** Quản lý hội thoại với cinema-agent: gửi tin, nhận stream, giữ phiên khi rời/quay lại màn chat. */
export function useAgentChat() {
  const messages = useAgentChatStore((s) => s.messages);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const streamingRef = useRef(false);
  const authStatus = useAuthStore((s) => s.status);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Đăng xuất: quên cuộc trò chuyện (phiên agent gắn với tài khoản).
  useEffect(() => {
    if (authStatus === "unauthenticated") useAgentChatStore.getState().reset();
  }, [authStatus]);

  const send = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text || streamingRef.current) return;
    streamingRef.current = true;
    setIsStreaming(true);

    const store = useAgentChatStore.getState();
    const agentId = uid("agent");
    store.setMessages((prev) => [
      ...prev,
      newUserMessage(text, uid("user")),
      newAgentMessage(agentId),
    ]);

    const controller = new AbortController();
    abortRef.current = controller;
    const apply = (ev: Parameters<typeof applyAgentEvent>[2]) =>
      useAgentChatStore
        .getState()
        .setMessages((prev) => applyAgentEvent(prev, agentId, ev));

    /** Một lượt stream; trả về true nếu nhận được sự kiện `end`. */
    const run = async (): Promise<boolean> => {
      let gotEnd = false;
      const token = await tokenStorage.getAccess();
      for await (const ev of streamAgentChat({
        message: text,
        sessionId: useAgentChatStore.getState().sessionId,
        token,
        signal: controller.signal,
      })) {
        if (ev.event === "session")
          useAgentChatStore.getState().setSessionId(ev.data.sessionId);
        if (ev.event === "end") gotEnd = true;
        apply(ev);
      }
      return gotEnd;
    };

    try {
      let gotEnd: boolean;
      try {
        gotEnd = await run();
      } catch (e) {
        // Access token hết hạn: gọi một API có xác thực để apiClient tự làm mới token, rồi thử lại một lần.
        if (
          e instanceof AgentHttpError &&
          e.status === 401 &&
          useAuthStore.getState().status === "authenticated"
        ) {
          try {
            await useAuthStore.getState().loadProfile();
          } catch {
            // Làm mới thất bại: để lỗi 401 bên dưới báo cho người dùng
          }
          gotEnd = await run();
        } else {
          throw e;
        }
      }
      if (!gotEnd) {
        apply({
          event: "error",
          data: {
            code: "STREAM_CLOSED",
            message: "Kết nối bị ngắt giữa chừng, bạn thử gửi lại nhé.",
          },
        });
      }
    } catch (e) {
      const aborted = (e as { name?: string })?.name === "AbortError";
      const message = aborted
        ? "Đã dừng."
        : e instanceof AgentHttpError
          ? e.message
          : "Có lỗi xảy ra, vui lòng thử lại.";
      apply({
        event: "error",
        data: { code: aborted ? "ABORTED" : "CLIENT_ERROR", message },
      });
    } finally {
      abortRef.current = null;
      streamingRef.current = false;
      setIsStreaming(false);
    }
  }, []);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  /** Bắt đầu cuộc trò chuyện mới (agent cũng quên ngữ cảnh cũ). */
  const reset = useCallback(() => {
    abortRef.current?.abort();
    useAgentChatStore.getState().reset();
  }, []);

  return { messages, isStreaming, send, stop, reset };
}
