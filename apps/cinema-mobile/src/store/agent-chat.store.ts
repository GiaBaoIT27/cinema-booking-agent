import { create } from "zustand";
import type { ChatMessage } from "@/features/ai-agent/types/agent.types";
import { nowLabel } from "@/features/ai-agent/utils/chat-reducer";

export const makeGreeting = (): ChatMessage => ({
  id: "greeting",
  sender: "agent",
  text: "Xin chào! Mình là trợ lý AI đặt vé. Bạn muốn xem phim gì, ở rạp nào, hay cần mình gợi ý suất chiếu phù hợp?",
  timestamp: nowLabel(),
  widgets: [],
  status: null,
  error: null,
});

const MAX_STORED = 60;

interface AgentChatState {
  messages: ChatMessage[];
  sessionId: string | undefined;
  setMessages: (updater: (prev: ChatMessage[]) => ChatMessage[]) => void;
  setSessionId: (id: string | undefined) => void;
  reset: () => void;
}

/** Giữ hội thoại trong bộ nhớ: rời màn chat rồi quay lại vẫn còn (tắt hẳn app thì mất). */
export const useAgentChatStore = create<AgentChatState>((set) => ({
  messages: [makeGreeting()],
  sessionId: undefined,
  setMessages: (updater) => set((s) => ({ messages: updater(s.messages).slice(-MAX_STORED) })),
  setSessionId: (sessionId) => set({ sessionId }),
  reset: () => set({ messages: [makeGreeting()], sessionId: undefined }),
}));
